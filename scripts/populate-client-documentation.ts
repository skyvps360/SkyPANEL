#!/usr/bin/env tsx

import 'dotenv/config';
import { db } from '../server/db';
import { docCategories, docs } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function populateClientDocumentation() {
  console.log("🚀 Starting client documentation population...\n");

  try {
    // Define client-focused documentation categories
    const categories = [
      {
        name: 'Getting Started',
        slug: 'getting-started',
        description: 'Essential guides to help you get up and running with your VPS services',
        displayOrder: 1
      },
      {
        name: 'Account Management',
        slug: 'account-management',
        description: 'Managing your account, billing, and subscription settings',
        displayOrder: 2
      },
      {
        name: 'Server Management',
        slug: 'server-management',
        description: 'Complete guides for managing your virtual private servers',
        displayOrder: 3
      },
      {
        name: 'DNS Management',
        slug: 'dns-management',
        description: 'Managing your domain names and DNS records',
        displayOrder: 4
      },
      {
        name: 'Security & Access',
        slug: 'security-access',
        description: 'Security best practices and access management',
        displayOrder: 5
      },
      {
        name: 'Billing & Payments',
        slug: 'billing-payments',
        description: 'Understanding billing, payments, and subscription management',
        displayOrder: 6
      },
      {
        name: 'Support & Troubleshooting',
        slug: 'support-troubleshooting',
        description: 'Getting help and resolving common issues',
        displayOrder: 7
      }
    ];

    let categoriesCreated = 0;
    let categoriesSkipped = 0;
    const categoryMap = new Map<string, number>();

    // Create categories
    console.log('📁 Creating documentation categories...');
    for (const category of categories) {
      console.log(`🔍 Checking if category '${category.name}' exists...`);
      
      const existingCategory = await db.select()
        .from(docCategories)
        .where(eq(docCategories.slug, category.slug))
        .limit(1);
      
      if (existingCategory.length > 0) {
        console.log(`   ⚠️  Category '${category.name}' already exists, skipping...`);
        categoryMap.set(category.slug, existingCategory[0].id);
        categoriesSkipped++;
        continue;
      }
      
      console.log(`   ✨ Creating category '${category.name}'...`);
      
      const [newCategory] = await db.insert(docCategories).values({
        name: category.name,
        slug: category.slug,
        description: category.description,
        displayOrder: category.displayOrder
      }).returning({ id: docCategories.id });
      
      categoryMap.set(category.slug, newCategory.id);
      categoriesCreated++;
      console.log(`   ✅ Category '${category.name}' created successfully!`);
    }

    // Define comprehensive client documentation
    const documentation = [
      // Getting Started
      {
        title: 'Welcome to SkyPANEL',
        slug: 'welcome-to-skypanel',
        categorySlug: 'getting-started',
        displayOrder: 1,
        content: `# Welcome to SkyPANEL

Welcome to SkyPANEL, your comprehensive VPS management platform. This guide will help you get started with managing your virtual private servers, domains, and hosting services.

## What is SkyPANEL?

SkyPANEL is a powerful client portal that provides you with complete control over your VPS hosting services. Through our intuitive interface, you can:

- **Manage Virtual Servers**: Create, configure, and monitor your VPS instances
- **DNS Management**: Configure domain names and DNS records
- **Account Management**: Handle billing, payments, and account settings
- **Support System**: Access help and submit support tickets
- **Security Features**: Manage access controls and security settings

## Key Features

### Server Management
- Real-time server monitoring and statistics
- One-click server actions (start, stop, restart, rebuild)
- Console access through integrated VNC viewer
- Server configuration and resource management

### DNS Management
- Complete DNS zone management
- Support for all standard DNS record types
- Real-time DNS propagation monitoring
- Bulk DNS operations

### Billing & Payments
- Transparent billing with detailed invoices
- Multiple payment methods supported
- Automatic billing and payment processing
- Usage tracking and cost optimization tools

### Security
- Two-factor authentication support
- API key management for automation
- Audit logs for all account activities
- Team management with role-based access

## Getting Started Checklist

1. **Complete Your Profile**: Update your account information and contact details
2. **Set Up Security**: Enable two-factor authentication for enhanced security
3. **Explore the Dashboard**: Familiarize yourself with the main navigation and features
4. **Create Your First Server**: Follow our server creation guide
5. **Configure DNS**: Set up your domain names and DNS records
6. **Review Billing**: Understand your billing cycle and payment methods

## Need Help?

Our support team is here to help you succeed. You can:
- Browse our comprehensive documentation
- Submit support tickets through the portal
- Access our knowledge base for common questions
- Contact our technical support team

Let's get started with your VPS journey!`
      },
      {
        title: 'Dashboard Overview',
        slug: 'dashboard-overview',
        categorySlug: 'getting-started',
        displayOrder: 2,
        content: `# Dashboard Overview

Your SkyPANEL dashboard is the central hub for managing all your hosting services. This guide will walk you through each section and help you understand how to navigate the platform effectively.

## Main Navigation

### Dashboard
The main dashboard provides an overview of your account status, including:
- **Server Status**: Quick view of all your servers and their current state
- **Recent Activity**: Latest actions and system notifications
- **Resource Usage**: Current usage statistics and limits
- **Billing Summary**: Account balance and upcoming payments

### Servers
The servers section allows you to:
- View all your virtual private servers
- Monitor server performance and resource usage
- Perform server management actions
- Access server console and logs

### DNS Management
Manage your domain names and DNS records:
- Add and configure DNS zones
- Create and modify DNS records
- Monitor DNS propagation status
- Bulk DNS operations

### Billing
Access your billing information:
- View current balance and payment history
- Download invoices and receipts
- Update payment methods
- Review usage and charges

### Support
Get help when you need it:
- Submit and track support tickets
- Access knowledge base articles
- View system status and announcements
- Contact support team

### Account Settings
Manage your account preferences:
- Update profile information
- Configure security settings
- Manage API keys
- Set notification preferences

## Quick Actions

The dashboard includes several quick action buttons for common tasks:
- **Create Server**: Launch a new VPS instance
- **Add Domain**: Register or configure a new domain
- **Submit Ticket**: Get help from our support team
- **View Billing**: Check your account balance and payments

## Status Indicators

Throughout the interface, you'll see various status indicators:
- 🟢 **Green**: Service is running normally
- 🟡 **Yellow**: Service has warnings or is in maintenance
- 🔴 **Red**: Service is down or has critical issues
- 🔵 **Blue**: Service is starting up or processing

## Customizing Your Dashboard

You can customize your dashboard experience by:
- Rearranging widget order
- Hiding or showing specific information panels
- Setting up custom alerts and notifications
- Configuring default views for different sections

## Mobile Access

SkyPANEL is fully responsive and works great on mobile devices. All core functionality is available on smartphones and tablets, allowing you to manage your services on the go.

## Keyboard Shortcuts

Speed up your workflow with these keyboard shortcuts:
- **Ctrl + /**: Open search
- **Ctrl + D**: Go to dashboard
- **Ctrl + S**: Go to servers
- **Ctrl + N**: Create new server
- **Ctrl + T**: Submit support ticket

Now that you're familiar with the dashboard, let's explore the specific features in more detail!`
      },
      {
        title: 'First Steps Guide',
        slug: 'first-steps-guide',
        categorySlug: 'getting-started',
        displayOrder: 3,
        content: `# First Steps Guide

Congratulations on joining SkyPANEL! This step-by-step guide will help you set up your account and get your first server running.

## Step 1: Complete Your Account Setup

### Update Your Profile
1. Navigate to **Account Settings** > **Profile**
2. Fill in your complete contact information
3. Verify your email address if not already done
4. Set your timezone and language preferences

### Enable Two-Factor Authentication
1. Go to **Account Settings** > **Security**
2. Click **Enable 2FA**
3. Scan the QR code with your authenticator app
4. Enter the verification code to confirm
5. Save your backup codes in a secure location

## Step 2: Add a Payment Method

1. Navigate to **Billing** > **Payment Methods**
2. Click **Add Payment Method**
3. Enter your payment information (credit card or PayPal)
4. Set as default payment method if desired
5. Verify the payment method if required

## Step 3: Create Your First Server

### Choose Your Server Configuration
1. Go to **Servers** > **Create New Server**
2. Select your preferred data center location
3. Choose an operating system (Ubuntu, CentOS, Debian, etc.)
4. Select server resources (CPU, RAM, Storage)
5. Configure additional options:
   - Server name and hostname
   - SSH keys (recommended)
   - Backup options
   - Monitoring preferences

### Deploy Your Server
1. Review your configuration and pricing
2. Click **Deploy Server**
3. Wait for the deployment process to complete (usually 2-5 minutes)
4. Note down your server credentials (sent via email)

## Step 4: Connect to Your Server

### Using SSH (Recommended)
1. Open your terminal or SSH client
2. Connect using: \`ssh root@your-server-ip\`
3. Enter your password or use SSH key authentication
4. Update your system: \`apt update && apt upgrade\` (Ubuntu/Debian)

### Using Web Console
1. Go to your server details page
2. Click **Console** to open the web-based terminal
3. Log in with your server credentials
4. Perform initial server setup

## Step 5: Secure Your Server

### Change Default Passwords
1. Change the root password: \`passwd\`
2. Create a non-root user: \`adduser username\`
3. Add user to sudo group: \`usermod -aG sudo username\`

### Configure Firewall
1. Enable UFW firewall: \`ufw enable\`
2. Allow SSH: \`ufw allow ssh\`
3. Allow HTTP/HTTPS: \`ufw allow 80,443/tcp\`
4. Configure additional rules as needed

### Update System
1. Update package lists: \`apt update\`
2. Upgrade packages: \`apt upgrade\`
3. Install essential tools: \`apt install curl wget git htop\`

## Step 6: Configure DNS (Optional)

If you have a domain name:

1. Go to **DNS Management**
2. Click **Add Zone**
3. Enter your domain name
4. Configure DNS records:
   - **A Record**: Point your domain to server IP
   - **CNAME**: Set up www subdomain
   - **MX**: Configure email if needed

## Step 7: Set Up Monitoring

1. Navigate to **Servers** > **Your Server** > **Monitoring**
2. Enable basic monitoring (CPU, RAM, Disk, Network)
3. Set up alerts for critical thresholds
4. Configure notification preferences

## Step 8: Install Your Applications

Depending on your needs, you might want to install:

### Web Server Stack
\`\`\`bash
# Install NGINX
apt install nginx

# Install PHP
apt install php-fpm php-mysql php-curl php-gd

# Install MySQL
apt install mysql-server
\`\`\`

### Docker
\`\`\`bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
\`\`\`

### Node.js
\`\`\`bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
apt install nodejs
\`\`\`

## Next Steps

- **Explore Advanced Features**: Learn about server snapshots, load balancers, and scaling options
- **Set Up Backups**: Configure automated backups for your important data
- **Join the Community**: Connect with other users in our community forums
- **Read Documentation**: Dive deeper into specific features you need

## Getting Help

If you encounter any issues during setup:

1. Check our **Knowledge Base** for common solutions
2. Submit a **Support Ticket** for personalized help
3. Use the **Live Chat** for immediate assistance
4. Email us at support@skypanel.com

Welcome to SkyPANEL! We're excited to help you succeed with your hosting journey.`
      },

      // Account Management
      {
        title: 'Managing Your Account',
        slug: 'managing-your-account',
        categorySlug: 'account-management',
        displayOrder: 1,
        content: `# Managing Your Account

Your SkyPANEL account is the foundation of your hosting experience. This guide covers everything you need to know about managing your account settings, security, and preferences.

## Account Information

### Profile Settings
Keep your account information up to date:

1. **Personal Information**
   - Full name and contact details
   - Phone number for account verification
   - Mailing address for billing purposes
   - Emergency contact information

2. **Communication Preferences**
   - Email notification settings
   - SMS alert preferences
   - Marketing communication options
   - Language and timezone settings

### Updating Your Profile
1. Navigate to **Account Settings** > **Profile**
2. Click **Edit** next to the section you want to modify
3. Make your changes and click **Save**
4. Verify any email changes through the confirmation link

## Security Settings

### Password Management
- Use a strong, unique password for your account
- Change your password regularly (every 90 days recommended)
- Never share your password with others
- Use a password manager for best security

### Two-Factor Authentication (2FA)
Strongly recommended for all accounts:

1. **Enable 2FA**:
   - Go to **Account Settings** > **Security**
   - Click **Enable Two-Factor Authentication**
   - Scan QR code with authenticator app (Google Authenticator, Authy, etc.)
   - Enter verification code to confirm

2. **Backup Codes**:
   - Save your backup codes in a secure location
   - Use backup codes if you lose access to your authenticator
   - Generate new backup codes periodically

3. **Recovery Options**:
   - Set up alternative recovery methods
   - Keep recovery email address current
   - Consider SMS backup (where available)

### API Key Management
For automation and third-party integrations:

1. **Creating API Keys**:
   - Navigate to **Account Settings** > **API Keys**
   - Click **Generate New Key**
   - Set appropriate permissions and restrictions
   - Copy and securely store the key

2. **API Key Security**:
   - Limit permissions to only what's needed
   - Set IP address restrictions when possible
   - Rotate keys regularly
   - Monitor API key usage

## Session Management

### Active Sessions
Monitor and control your account access:

1. **View Active Sessions**:
   - Go to **Account Settings** > **Security** > **Active Sessions**
   - Review login locations and devices
   - Check for any suspicious activity

2. **Session Controls**:
   - Terminate suspicious sessions immediately
   - Set session timeout preferences
   - Enable automatic logout on browser close

### Login History
Keep track of account access:
- Review recent login attempts
- Monitor failed login attempts
- Check for unusual access patterns
- Report suspicious activity to support

## Team Management

### Adding Team Members
For businesses and organizations:

1. **Invite Users**:
   - Go to **Account Settings** > **Team**
   - Click **Invite Member**
   - Enter email address and set permissions
   - Send invitation

2. **Permission Levels**:
   - **Admin**: Full account access
   - **User**: Limited server management
   - **Billing**: Billing and payment access only
   - **Support**: Can submit and view tickets
   - **Custom**: Define specific permissions

### Managing Team Access
- Regularly review team member permissions
- Remove access for former team members
- Use role-based access control
- Monitor team member activity

## Notification Preferences

### Email Notifications
Configure what notifications you receive:

1. **System Notifications**:
   - Server status changes
   - Maintenance announcements
   - Security alerts
   - Service updates

2. **Billing Notifications**:
   - Payment confirmations
   - Invoice generation
   - Payment failures
   - Subscription changes

3. **Support Notifications**:
   - Ticket updates
   - Support responses
   - Resolution confirmations

### SMS Alerts
For critical notifications:
- Server downtime alerts
- Security breach notifications
- Payment failure alerts
- Emergency maintenance notices

## Account Verification

### Identity Verification
For enhanced security and higher limits:

1. **Document Upload**:
   - Government-issued ID
   - Proof of address
   - Business registration (for business accounts)

2. **Verification Process**:
   - Upload clear, readable documents
   - Wait for verification (usually 24-48 hours)
   - Respond to any verification requests
   - Receive confirmation of verified status

### Benefits of Verification
- Higher resource limits
- Priority support
- Access to premium features
- Enhanced account security

## Data and Privacy

### Data Export
Download your account data:
- Account information and settings
- Server configurations and logs
- Billing history and invoices
- Support ticket history

### Data Retention
Understand our data policies:
- How long we keep your data
- What happens when you close your account
- Your rights regarding your data
- How to request data deletion

### Privacy Controls
- Review privacy settings
- Control data sharing preferences
- Manage cookie preferences
- Opt out of analytics (where applicable)

## Account Closure

If you need to close your account:

1. **Before Closing**:
   - Download any important data
   - Cancel active services
   - Resolve outstanding billing
   - Export configurations and backups

2. **Closure Process**:
   - Contact support to initiate closure
   - Confirm closure request
   - Complete final billing
   - Receive closure confirmation

## Best Practices

### Security Best Practices
- Enable 2FA on your account
- Use strong, unique passwords
- Regularly review account activity
- Keep contact information current
- Monitor team member access

### Account Maintenance
- Review settings monthly
- Update payment methods before expiration
- Keep backup contact methods current
- Regularly audit team permissions
- Monitor account usage and limits

## Getting Help

If you need assistance with account management:
- Check our Knowledge Base for common questions
- Submit a support ticket for account-specific issues
- Use live chat for immediate help
- Email support@skypanel.com for complex issues

Your account security and proper management are crucial for a smooth hosting experience. Take time to configure these settings properly!`
      },

      // Server Management
      {
        title: 'Creating and Managing Servers',
        slug: 'creating-managing-servers',
        categorySlug: 'server-management',
        displayOrder: 1,
        content: `# Creating and Managing Servers

This comprehensive guide covers everything you need to know about creating, configuring, and managing your virtual private servers (VPS) through SkyPANEL.

## Creating a New Server

### Step 1: Choose Server Configuration

1. **Navigate to Server Creation**:
   - Go to **Servers** > **Create New Server**
   - Or click the **Create Server** button on your dashboard

2. **Select Data Center Location**:
   - Choose the location closest to your users
   - Consider data sovereignty requirements
   - Review latency and connectivity options
   - Available locations:
     - North America (US East, US West, Canada)
     - Europe (UK, Germany, Netherlands, France)
     - Asia Pacific (Singapore, Japan, Australia)

3. **Choose Operating System**:
   - **Linux Distributions**:
     - Ubuntu 20.04 LTS, 22.04 LTS (Recommended for beginners)
     - CentOS 7, 8, Rocky Linux 8, 9
     - Debian 10, 11, 12
     - Fedora 36, 37, 38
     - openSUSE Leap 15.4
   - **Windows Server** (Premium plans only):
     - Windows Server 2019
     - Windows Server 2022
   - **Application Images**:
     - WordPress
     - Docker
     - LAMP Stack
     - Node.js
     - Python/Django

### Step 2: Configure Resources

1. **CPU and RAM**:
   - **Starter**: 1 vCPU, 1GB RAM - Perfect for development
   - **Basic**: 1 vCPU, 2GB RAM - Small websites and applications
   - **Standard**: 2 vCPU, 4GB RAM - Medium traffic websites
   - **Performance**: 4 vCPU, 8GB RAM - High-performance applications
   - **Enterprise**: 8+ vCPU, 16+ GB RAM - Large-scale applications

2. **Storage Options**:
   - **SSD Storage**: Fast, reliable, perfect for databases
   - **NVMe Storage**: Ultra-fast, ideal for high-IOPS applications
   - **Storage Size**: 25GB to 1TB+ available
   - **Additional Volumes**: Can be added after creation

3. **Network Configuration**:
   - **Bandwidth**: Unmetered on all plans
   - **IPv4 Address**: Included with every server
   - **IPv6 Support**: Available in all locations
   - **Private Networking**: For server-to-server communication

### Step 3: Advanced Configuration

1. **SSH Key Setup** (Highly Recommended):
   - Upload your public SSH key for secure access
   - Generate new SSH keys if needed
   - Multiple keys can be added
   - Disable password authentication for enhanced security

2. **Server Naming**:
   - **Server Name**: Friendly name for identification
   - **Hostname**: System hostname (FQDN recommended)
   - **Tags**: Organize servers with custom tags

3. **Additional Options**:
   - **Automatic Backups**: Daily, weekly, or monthly
   - **Monitoring**: Enable detailed performance monitoring
   - **Firewall**: Configure initial firewall rules
   - **User Data**: Cloud-init script for automated setup

### Step 4: Review and Deploy

1. **Configuration Review**:
   - Verify all settings are correct
   - Review monthly pricing
   - Check resource allocations
   - Confirm data center location

2. **Deployment**:
   - Click **Deploy Server**
   - Deployment typically takes 2-5 minutes
   - You'll receive email confirmation with server details
   - Server will appear in your dashboard when ready

## Server Management

### Server Dashboard

Each server has a dedicated dashboard showing:

1. **Overview Information**:
   - Server status and uptime
   - IP addresses (IPv4 and IPv6)
   - Operating system and version
   - Resource usage (CPU, RAM, Disk, Network)
   - Current billing information

2. **Quick Actions**:
   - **Power Controls**: Start, Stop, Restart, Force Stop
   - **Console Access**: Web-based terminal
   - **Rebuild**: Reinstall operating system
   - **Resize**: Upgrade or downgrade resources
   - **Snapshot**: Create point-in-time backup

### Power Management

1. **Start/Stop Operations**:
   - **Start**: Boot the server
   - **Stop**: Graceful shutdown (recommended)
   - **Force Stop**: Immediate shutdown (use with caution)
   - **Restart**: Graceful reboot
   - **Force Restart**: Hard reboot

2. **Scheduled Operations**:
   - Schedule automatic restarts
   - Set maintenance windows
   - Configure auto-start after power events

### Console Access

1. **Web Console**:
   - Browser-based terminal access
   - No additional software required
   - Full keyboard and mouse support
   - Copy/paste functionality

2. **VNC Console**:
   - Graphical console access
   - Useful for GUI operating systems
   - BIOS/UEFI access during boot
   - Recovery mode access

### Server Monitoring

1. **Real-time Metrics**:
   - CPU usage and load average
   - Memory usage and swap
   - Disk I/O and space usage
   - Network traffic (inbound/outbound)
   - Process monitoring

2. **Historical Data**:
   - Performance graphs (1 hour to 1 year)
   - Resource usage trends
   - Uptime statistics
   - Alert history

3. **Alerts and Notifications**:
   - CPU usage thresholds
   - Memory usage alerts
   - Disk space warnings
   - Network anomaly detection
   - Custom metric alerts

### Server Configuration

1. **Network Settings**:
   - Configure additional IP addresses
   - Set up private networking
   - Manage firewall rules
   - Configure reverse DNS (PTR records)

2. **Storage Management**:
   - Add additional storage volumes
   - Resize existing volumes
   - Configure RAID (where supported)
   - Set up automated backups

3. **Security Settings**:
   - Manage SSH keys
   - Configure firewall rules
   - Set up intrusion detection
   - Enable audit logging

## Advanced Server Operations

### Server Snapshots

1. **Creating Snapshots**:
   - Navigate to **Servers** > **Your Server** > **Snapshots**
   - Click **Create Snapshot**
   - Provide a descriptive name
   - Wait for snapshot completion

2. **Managing Snapshots**:
   - View all available snapshots
   - Restore server from snapshot
   - Delete old snapshots to save space
   - Schedule automatic snapshots

3. **Snapshot Best Practices**:
   - Create snapshots before major changes
   - Keep snapshots for important milestones
   - Regular cleanup of old snapshots
   - Test snapshot restoration process

### Server Resizing

1. **Upgrade Resources**:
   - Increase CPU cores
   - Add more RAM
   - Expand storage capacity
   - Upgrade network performance

2. **Downgrade Considerations**:
   - Ensure current usage fits new limits
   - Backup important data first
   - Plan for potential downtime
   - Test applications after downgrade

3. **Resizing Process**:
   - Select new configuration
   - Review pricing changes
   - Schedule resize operation
   - Monitor server after resize

### Server Rebuilding

1. **When to Rebuild**:
   - Operating system corruption
   - Major security compromise
   - Switching operating systems
   - Starting fresh configuration

2. **Rebuild Process**:
   - **Backup Important Data**: Download or snapshot critical files
   - **Select New OS**: Choose operating system and version
   - **Configure Settings**: Set hostname, SSH keys, etc.
   - **Initiate Rebuild**: Confirm and start the process
   - **Restore Data**: Upload backed up files

3. **Post-Rebuild Tasks**:
   - Verify server accessibility
   - Restore applications and configurations
   - Update DNS records if IP changed
   - Test all services and applications

## Server Security

### Initial Security Setup

1. **Change Default Passwords**:
   \`\`\`bash
   # Change root password
   passwd
   
   # Create non-root user
   adduser username
   usermod -aG sudo username
   \`\`\`

2. **Configure SSH Security**:
   \`\`\`bash
   # Edit SSH configuration
   nano /etc/ssh/sshd_config
   
   # Recommended settings:
   PermitRootLogin no
   PasswordAuthentication no
   PubkeyAuthentication yes
   Port 2222  # Change default port
   
   # Restart SSH service
   systemctl restart sshd
   \`\`\`

3. **Set Up Firewall**:
\`\`\`bash
   # Ubuntu/Debian - UFW
   ufw enable
   ufw allow 2222/tcp  # SSH on custom port
   ufw allow 80/tcp    # HTTP
   ufw allow 443/tcp   # HTTPS
   
   # CentOS/RHEL - firewalld
   firewall-cmd --permanent --add-port=2222/tcp
   firewall-cmd --permanent --add-service=http
   firewall-cmd --permanent --add-service=https
   firewall-cmd --reload
   \`\`\`

### Ongoing Security Maintenance

1. **Regular Updates**:
   \`\`\`bash
   # Ubuntu/Debian
   apt update && apt upgrade
   
   # CentOS/RHEL
   yum update
   # or
   dnf update
   \`\`\`

2. **Security Monitoring**:
   - Install and configure fail2ban
   - Set up log monitoring
   - Enable intrusion detection
   - Regular security audits

3. **Backup Strategy**:
   - Automated daily backups
   - Off-site backup storage
   - Regular backup testing
   - Disaster recovery planning

## Troubleshooting Common Issues

### Server Won't Start
1. Check server status in control panel
2. Review console for boot errors
3. Verify resource availability
4. Contact support if hardware issues suspected

### Can't Connect via SSH
1. Verify server is running
2. Check firewall rules
3. Confirm SSH service is running
4. Verify SSH key configuration
5. Use web console for troubleshooting

### High Resource Usage
1. Identify resource-intensive processes
2. Review application logs
3. Consider server upgrade
4. Optimize applications and databases

### Network Connectivity Issues
1. Check server network configuration
2. Verify DNS settings
3. Test connectivity from multiple locations
4. Review firewall and security group rules

## Best Practices

### Performance Optimization
- Monitor resource usage regularly
- Optimize applications and databases
- Use caching where appropriate
- Keep software updated
- Regular performance testing

### Security Best Practices
- Use SSH keys instead of passwords
- Keep software updated
- Implement proper firewall rules
- Regular security audits
- Monitor logs for suspicious activity

### Backup and Recovery
- Automated backup scheduling
- Test backup restoration regularly
- Multiple backup locations
- Document recovery procedures
- Regular disaster recovery testing

## Getting Help

If you need assistance with server management:
- Check our Knowledge Base for solutions
- Use the web console for direct server access
- Submit a support ticket for complex issues
- Contact our technical support team
- Join our community forums for peer support

Proper server management is key to a successful hosting experience. Take time to understand these features and implement best practices for optimal performance and security!`
      },

      // DNS Management
      {
        title: 'DNS Management Guide',
        slug: 'dns-management-guide',
        categorySlug: 'dns-management',
        displayOrder: 1,
        content: `# DNS Management Guide

Domain Name System (DNS) management is crucial for connecting your domain names to your servers and services. This comprehensive guide will help you understand and manage DNS through SkyPANEL.

## Understanding DNS

### What is DNS?
DNS translates human-readable domain names (like example.com) into IP addresses that computers use to communicate. It's like a phone book for the internet.

### Key DNS Concepts

1. **Domain Name**: The human-readable address (example.com)
2. **Zone**: A portion of the DNS namespace managed as a unit
3. **DNS Records**: Instructions that tell DNS servers how to respond to queries
4. **TTL (Time To Live)**: How long DNS information is cached
5. **Propagation**: The time it takes for DNS changes to spread globally

## DNS Record Types

### A Record
- **Purpose**: Points a domain to an IPv4 address
- **Example**: \`example.com\` → \`192.168.1.100\`
- **Use Cases**: Main website, subdomains

### AAAA Record
- **Purpose**: Points a domain to an IPv6 address
- **Example**: \`example.com\` → \`2001:db8::1\`
- **Use Cases**: IPv6-enabled websites and services

### CNAME Record
- **Purpose**: Creates an alias pointing to another domain
- **Example**: \`www.example.com\` → \`example.com\`
- **Use Cases**: Subdomains, CDN configurations
- **Important**: Cannot be used for root domain

### MX Record
- **Purpose**: Specifies mail servers for the domain
- **Example**: \`example.com\` → \`mail.example.com\` (priority 10)
- **Use Cases**: Email routing, multiple mail servers

### TXT Record
- **Purpose**: Stores text information for various purposes
- **Use Cases**: 
  - SPF records for email authentication
  - Domain verification
  - DKIM signatures
  - Site verification tokens

### NS Record
- **Purpose**: Specifies authoritative name servers
- **Example**: \`example.com\` → \`ns1.skypanel.com\`
- **Use Cases**: Delegating DNS management

### SRV Record
- **Purpose**: Specifies services available on specific ports
- **Example**: \`_sip._tcp.example.com\` → \`sip.example.com:5060\`
- **Use Cases**: VoIP, instant messaging, game servers

### PTR Record
- **Purpose**: Reverse DNS lookup (IP to domain)
- **Example**: \`100.1.168.192.in-addr.arpa\` → \`example.com\`
- **Use Cases**: Email server reputation, logging

## Managing DNS Zones

### Creating a DNS Zone

1. **Add New Zone**:
   - Navigate to **DNS Management**
   - Click **Add Zone**
   - Enter your domain name
   - Select zone type (Primary recommended)
   - Click **Create Zone**

2. **Zone Configuration**:
   - **Primary Zone**: Full control over DNS records
   - **Secondary Zone**: Slave zone copying from primary
   - **Reverse Zone**: For PTR records (IP to domain)

### Zone Settings

1. **SOA (Start of Authority) Record**:
   - **Primary Name Server**: Authoritative server
   - **Admin Email**: Contact for zone issues
   - **Serial Number**: Version number (auto-incremented)
   - **Refresh**: How often secondary servers check for updates
   - **Retry**: Retry interval if refresh fails
   - **Expire**: When secondary servers stop answering
   - **Minimum TTL**: Default TTL for records

2. **Default Name Servers**:
   - SkyPANEL provides reliable name servers
   - Custom name servers can be configured
   - Minimum 2 name servers recommended

## Managing DNS Records

### Adding DNS Records

1. **Navigate to Zone**:
   - Go to **DNS Management**
   - Click on your domain zone
   - Click **Add Record**

2. **Record Configuration**:
   - **Type**: Select record type (A, AAAA, CNAME, etc.)
   - **Name**: Subdomain or @ for root domain
   - **Value**: Target IP address or domain
   - **TTL**: Cache time (300-86400 seconds)
   - **Priority**: For MX and SRV records

### Common DNS Configurations

#### Basic Website Setup
\`\`\`
# Root domain to server
@     A     192.168.1.100   3600

# WWW subdomain
www   CNAME example.com      3600

# Mail server
@     MX    mail.example.com 10   3600
mail  A     192.168.1.101   3600
\`\`\`

#### Email Configuration
\`\`\`
# MX Records
@     MX    mail.example.com      10   3600
@     MX    backup-mail.example.com 20  3600

# SPF Record
@     TXT   "v=spf1 include:_spf.google.com ~all" 3600

# DKIM Record
default._domainkey TXT "v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3..." 3600

# DMARC Record
_dmarc TXT   "v=DMARC1; p=quarantine; rua=mailto:dmarc@example.com" 3600
\`\`\`

#### CDN and Services
\`\`\`
# CDN Configuration
cdn   CNAME d1234567890.cloudfront.net 300

# API Subdomain
api   A     192.168.1.102   3600

# FTP Server
ftp   A     192.168.1.103   3600

# Wildcard Subdomain
*     A     192.168.1.100   3600
\`\`\`

### Editing DNS Records

1. **Modify Existing Records**:
   - Click the edit icon next to the record
   - Update the values as needed
   - Save changes
   - Wait for propagation

2. **Bulk Operations**:
   - Import records from file
   - Export current configuration
   - Bulk delete records
   - Copy records between zones

### Deleting DNS Records

1. **Single Record Deletion**:
   - Click the delete icon next to the record
   - Confirm deletion
   - Changes take effect immediately

2. **Bulk Deletion**:
   - Select multiple records
   - Click **Delete Selected**
   - Confirm bulk deletion

## DNS Propagation

### Understanding Propagation

1. **What is Propagation?**:
   - Time for DNS changes to spread globally
   - Affected by TTL values and caching
   - Can take minutes to hours

2. **Factors Affecting Propagation**:
   - **TTL Values**: Lower TTL = faster propagation
   - **ISP Caching**: Some ISPs cache longer
   - **Geographic Location**: Distance from name servers
   - **Record Type**: Some types propagate faster

### Checking Propagation Status

1. **Built-in Tools**:
   - Use SkyPANEL's propagation checker
   - View global DNS status
   - Monitor propagation progress

2. **External Tools**:
   - whatsmydns.net
   - dnschecker.org
   - dig command line tool

3. **Command Line Checking**:
   \`\`\`bash
   # Check A record
   dig example.com A
   
   # Check specific name server
   dig @8.8.8.8 example.com A
   
   # Check MX records
   dig example.com MX
   
   # Trace DNS path
   dig +trace example.com
   \`\`\`

## Advanced DNS Features

### DNSSEC (DNS Security Extensions)

1. **What is DNSSEC?**:
   - Adds cryptographic signatures to DNS
   - Prevents DNS spoofing and cache poisoning
   - Ensures DNS response authenticity

2. **Enabling DNSSEC**:
   - Navigate to zone settings
   - Enable DNSSEC signing
   - Configure DS records at registrar
   - Monitor DNSSEC status

### GeoDNS

1. **Geographic Routing**:
   - Route users to nearest servers
   - Improve performance and latency
   - Comply with data sovereignty laws

2. **Configuration**:
   - Set up multiple server locations
   - Configure geographic rules
   - Test from different locations
   - Monitor performance metrics

### Health Checks and Failover

1. **Health Monitoring**:
   - Monitor server availability
   - Automatic failover to backup servers
   - Email alerts for failures

2. **Failover Configuration**:
   - Primary and backup servers
   - Health check intervals
   - Failover thresholds
   - Recovery procedures

## DNS Best Practices

### Performance Optimization

1. **TTL Management**:
   - Use appropriate TTL values
   - Lower TTL before changes
   - Increase TTL for stable records
   - Balance between performance and flexibility

2. **Record Organization**:
   - Use consistent naming conventions
   - Group related records together
   - Document complex configurations
   - Regular cleanup of unused records

### Security Best Practices

1. **Access Control**:
   - Limit DNS management access
   - Use strong authentication
   - Regular access reviews
   - Audit DNS changes

2. **Monitoring and Alerting**:
   - Monitor DNS resolution times
   - Alert on propagation delays
   - Track unauthorized changes
   - Regular DNS health checks

### Backup and Recovery

1. **Zone Backups**:
   - Regular zone file exports
   - Version control for DNS configs
   - Test backup restoration
   - Document recovery procedures

2. **Disaster Recovery**:
   - Secondary DNS providers
   - Emergency contact procedures
   - Rapid response protocols
   - Communication plans

## Troubleshooting DNS Issues

### Common Problems

1. **Domain Not Resolving**:
   - Check name server configuration
   - Verify A/AAAA records exist
   - Test from multiple locations
   - Check for typos in records

2. **Email Not Working**:
   - Verify MX records
   - Check SPF/DKIM/DMARC records
   - Test mail server connectivity
   - Review email logs

3. **Slow Propagation**:
   - Check TTL values
   - Clear local DNS cache
   - Test with different DNS servers
   - Wait for full propagation cycle

### Diagnostic Tools

1. **Built-in Diagnostics**:
   - SkyPANEL DNS checker
   - Zone validation tools
   - Propagation monitoring
   - Error reporting

2. **External Tools**:
   \`\`\`bash
   # DNS lookup tools
   nslookup example.com
   dig example.com
   host example.com
   
   # Windows tools
   nslookup example.com
   ping example.com
   tracert example.com
   \`\`\`

## Migration and Transfers

### Migrating DNS to SkyPANEL

1. **Pre-Migration**:
   - Export current DNS records
   - Document current configuration
   - Plan migration timeline
   - Prepare rollback procedures

2. **Migration Process**:
   - Create zone in SkyPANEL
   - Import DNS records
   - Verify all records are correct
   - Update name servers at registrar
   - Monitor propagation

3. **Post-Migration**:
   - Verify all services work
   - Monitor for issues
   - Update documentation
   - Clean up old configurations

### Domain Transfers

1. **Transferring Domains**:
   - Unlock domain at current registrar
   - Obtain transfer authorization code
   - Initiate transfer process
   - Approve transfer request
   - Update DNS settings

## Getting Help

If you need assistance with DNS management:

- **Knowledge Base**: Search for DNS-related articles
- **DNS Tools**: Use built-in diagnostic tools
- **Support Tickets**: Submit detailed DNS issues
- **Live Chat**: Get immediate help with urgent DNS problems
- **Community Forums**: Connect with other users
- **Documentation**: Review technical DNS documentation

### When to Contact Support

- DNS propagation issues lasting over 48 hours
- DNSSEC configuration problems
- Complex DNS routing requirements
- Bulk DNS operations
- Integration with external services

Proper DNS management is essential for your online presence. Take time to understand these concepts and implement best practices for reliable, fast DNS resolution!`
      },

      // Security & Access
      {
        title: 'Security Best Practices',
        slug: 'security-best-practices',
        categorySlug: 'security-access',
        displayOrder: 1,
        content: `# Security Best Practices

Security is paramount when managing your VPS and hosting services. This comprehensive guide covers essential security practices to protect your servers, data, and applications.

## Account Security

### Strong Authentication

1. **Password Security**:
   - Use unique, complex passwords (minimum 12 characters)
   - Include uppercase, lowercase, numbers, and symbols
   - Never reuse passwords across services
   - Use a reputable password manager
   - Change passwords regularly (every 90 days)

2. **Two-Factor Authentication (2FA)**:
   - **Enable 2FA immediately** on your SkyPANEL account
   - Use authenticator apps (Google Authenticator, Authy, 1Password)
   - Save backup codes in a secure location
   - Never share 2FA codes or backup codes
   - Consider hardware security keys for maximum security

3. **Account Monitoring**:
   - Regularly review login history
   - Monitor active sessions
   - Set up login alerts
   - Immediately report suspicious activity
   - Use unique email addresses for important accounts

### API Security

1. **API Key Management**:
   - Generate API keys with minimal required permissions
   - Rotate API keys regularly (monthly recommended)
   - Store API keys securely (never in code repositories)
   - Use environment variables for API keys
   - Monitor API key usage and access logs

2. **API Access Control**:
   - Restrict API access by IP address when possible
   - Use HTTPS only for API communications
   - Implement rate limiting
   - Log all API requests and responses
   - Revoke unused or compromised API keys immediately

## Server Security

### Initial Server Hardening

1. **User Account Security**:
   \`\`\`bash
   # Create non-root user
   adduser username
   usermod -aG sudo username
   
   # Disable root login
   sudo passwd -l root
   
   # Set strong password policies
   sudo nano /etc/security/pwquality.conf
   \`\`\`

2. **SSH Security Configuration**:
   \`\`\`bash
   # Edit SSH configuration
   sudo nano /etc/ssh/sshd_config
   
   # Recommended settings:
   Port 2222                    # Change default port
   PermitRootLogin no          # Disable root login
   PasswordAuthentication no   # Use keys only
   PubkeyAuthentication yes    # Enable key auth
   MaxAuthTries 3             # Limit login attempts
   ClientAliveInterval 300    # Session timeout
   ClientAliveCountMax 2      # Max idle sessions
   
   # Restart SSH service
   sudo systemctl restart sshd
   \`\`\`

3. **SSH Key Management**:
   \`\`\`bash
   # Generate SSH key pair (on your local machine)
   ssh-keygen -t ed25519 -C "your-email@example.com"
   
   # Copy public key to server
   ssh-copy-id -i ~/.ssh/id_ed25519.pub username@server-ip
   
   # Set proper permissions
   chmod 700 ~/.ssh
   chmod 600 ~/.ssh/authorized_keys
   \`\`\`

### Firewall Configuration

1. **UFW (Ubuntu/Debian)**:
   \`\`\`bash
   # Enable UFW
   sudo ufw enable
   
   # Default policies
   sudo ufw default deny incoming
   sudo ufw default allow outgoing
   
   # Allow essential services
   sudo ufw allow 2222/tcp     # SSH (custom port)
   sudo ufw allow 80/tcp       # HTTP
   sudo ufw allow 443/tcp      # HTTPS
   
   # Allow specific IPs only
   sudo ufw allow from 192.168.1.100 to any port 22
   
   # Check status
   sudo ufw status verbose
   \`\`\`

2. **firewalld (CentOS/RHEL)**:
   \`\`\`bash
   # Start and enable firewalld
   sudo systemctl start firewalld
   sudo systemctl enable firewalld
   
   # Configure zones
   sudo firewall-cmd --set-default-zone=public
   
   # Add services
   sudo firewall-cmd --permanent --add-port=2222/tcp
   sudo firewall-cmd --permanent --add-service=http
   sudo firewall-cmd --permanent --add-service=https
   
   # Reload configuration
   sudo firewall-cmd --reload
   \`\`\`

3. **Advanced Firewall Rules**:
   \`\`\`bash
   # Rate limiting for SSH
   sudo ufw limit 2222/tcp
   
   # Allow specific applications
   sudo ufw allow 'Nginx Full'
   sudo ufw allow 'OpenSSH'
   
   # Block specific IPs
   sudo ufw deny from 192.168.1.200
   
   # Allow port ranges
   sudo ufw allow 6000:6007/tcp
   \`\`\`

### System Updates and Patches

1. **Automated Updates**:
   \`\`\`bash
   # Ubuntu/Debian - Install unattended-upgrades
   sudo apt install unattended-upgrades
   sudo dpkg-reconfigure -plow unattended-upgrades
   
   # Configure automatic security updates
   sudo nano /etc/apt/apt.conf.d/50unattended-upgrades
   \`\`\`

2. **Manual Update Process**:
   \`\`\`bash
   # Ubuntu/Debian
   sudo apt update
   sudo apt list --upgradable
   sudo apt upgrade
   sudo apt autoremove
   
   # CentOS/RHEL
   sudo yum update
   # or
   sudo dnf update
   \`\`\`

3. **Kernel Updates**:
   \`\`\`bash
   # Check current kernel
   uname -r
   
   # Install new kernel (Ubuntu)
   sudo apt install linux-generic
   
   # Reboot to apply kernel updates
   sudo reboot
   \`\`\`

### Intrusion Detection and Prevention

1. **Fail2Ban Installation and Configuration**:
   \`\`\`bash
   # Install Fail2Ban
   sudo apt install fail2ban  # Ubuntu/Debian
   sudo yum install fail2ban   # CentOS/RHEL
   
   # Create local configuration
   sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
   
   # Edit configuration
   sudo nano /etc/fail2ban/jail.local
   \`\`\`

2. **Fail2Ban Configuration**:
   \`\`\`ini
   [DEFAULT]
   bantime = 3600
   findtime = 600
   maxretry = 3
   ignoreip = 127.0.0.1/8 ::1 192.168.1.0/24
   
   [sshd]
   enabled = true
   port = 2222
   filter = sshd
   logpath = /var/log/auth.log
   maxretry = 3
   bantime = 3600
   
   [nginx-http-auth]
   enabled = true
   filter = nginx-http-auth
   logpath = /var/log/nginx/error.log
   maxretry = 3
   \`\`\`

3. **Log Monitoring**:
   \`\`\`bash
   # Monitor authentication logs
   sudo tail -f /var/log/auth.log
   
   # Check failed login attempts
   sudo grep "Failed password" /var/log/auth.log
   
   # Monitor Fail2Ban status
   sudo fail2ban-client status
   sudo fail2ban-client status sshd
   \`\`\`

## Application Security

### Web Application Security

1. **HTTPS Configuration**:
   \`\`\`bash
   # Install Certbot for Let's Encrypt
   sudo apt install certbot python3-certbot-nginx
   
   # Obtain SSL certificate
   sudo certbot --nginx -d example.com -d www.example.com
   
   # Auto-renewal setup
   sudo crontab -e
   # Add: 0 12 * * * /usr/bin/certbot renew --quiet
   \`\`\`

2. **Nginx Security Headers**:
   \`\`\`nginx
   server {
       # Security headers
       add_header X-Frame-Options "SAMEORIGIN" always;
       add_header X-XSS-Protection "1; mode=block" always;
       add_header X-Content-Type-Options "nosniff" always;
       add_header Referrer-Policy "no-referrer-when-downgrade" always;
       add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
       add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
       
       # Hide server version
       server_tokens off;
       
       # Rate limiting
       limit_req_zone $binary_remote_addr zone=login:10m rate=10r/m;
       limit_req zone=login burst=5 nodelay;
   }
   \`\`\`

3. **Database Security**:
   \`\`\`bash
   # MySQL/MariaDB security
   sudo mysql_secure_installation
   
   # Create database user with limited privileges
   mysql -u root -p
   CREATE USER 'appuser'@'localhost' IDENTIFIED BY 'strong_password';
   GRANT SELECT, INSERT, UPDATE, DELETE ON appdb.* TO 'appuser'@'localhost';
   FLUSH PRIVILEGES;
   \`\`\`

### File and Directory Permissions

1. **Web Directory Permissions**:
   \`\`\`bash
   # Set proper ownership
   sudo chown -R www-data:www-data /var/www/html
   
   # Set directory permissions
   sudo find /var/www/html -type d -exec chmod 755 {} \;
   
   # Set file permissions
   sudo find /var/www/html -type f -exec chmod 644 {} \;
   
   # Secure configuration files
   sudo chmod 600 /var/www/html/config.php
   \`\`\`

2. **System File Permissions**:
   \`\`\`bash
   # Secure SSH directory
   chmod 700 ~/.ssh
   chmod 600 ~/.ssh/authorized_keys
   chmod 600 ~/.ssh/id_rsa
   chmod 644 ~/.ssh/id_rsa.pub
   
   # Secure configuration files
   sudo chmod 644 /etc/passwd
   sudo chmod 640 /etc/shadow
   sudo chmod 644 /etc/group
   \`\`\`

## Network Security

### VPN and Secure Access

1. **OpenVPN Server Setup**:
   \`\`\`bash
   # Install OpenVPN
   sudo apt install openvpn easy-rsa
   
   # Set up Certificate Authority
   make-cadir ~/openvpn-ca
   cd ~/openvpn-ca
   source vars
   ./clean-all
   ./build-ca
   ./build-key-server server
   ./build-dh
   \`\`\`

2. **WireGuard Configuration**:
   \`\`\`bash
   # Install WireGuard
   sudo apt install wireguard
   
   # Generate keys
   wg genkey | tee privatekey | wg pubkey > publickey
   
   # Configure server
   sudo nano /etc/wireguard/wg0.conf
   \`\`\`

### Network Monitoring

1. **Traffic Analysis**:
   \`\`\`bash
   # Install network monitoring tools
   sudo apt install iftop nethogs nload
   
   # Monitor network traffic
   sudo iftop -i eth0
   sudo nethogs eth0
   sudo nload eth0
   \`\`\`

2. **Port Scanning Detection**:
   \`\`\`bash
   # Install portsentry
   sudo apt install portsentry
   
   # Configure portsentry
   sudo nano /etc/portsentry/portsentry.conf
   
   # Start portsentry
   sudo systemctl enable portsentry
   sudo systemctl start portsentry
   \`\`\`

## Backup and Recovery Security

### Secure Backup Practices

1. **Encrypted Backups**:
   \`\`\`bash
   # Create encrypted backup
   tar -czf - /important/data | gpg --cipher-algo AES256 --compress-algo 1 --symmetric --output backup.tar.gz.gpg
   
   # Restore encrypted backup
   gpg --decrypt backup.tar.gz.gpg | tar -xzf -
   \`\`\`

2. **Automated Backup Script**:
   \`\`\`bash
   #!/bin/bash
   # Secure backup script
   
   BACKUP_DIR="/backups"
   DATE=$(date +%Y%m%d_%H%M%S)
   
   # Create encrypted backup
   tar -czf - /var/www /etc /home | \
   gpg --cipher-algo AES256 --symmetric \
   --output "$BACKUP_DIR/backup_$DATE.tar.gz.gpg"
   
   # Upload to secure storage
   rsync -avz --delete "$BACKUP_DIR/" user@backup-server:/backups/
   
   # Clean old backups
   find "$BACKUP_DIR" -name "backup_*.tar.gz.gpg" -mtime +30 -delete
   \`\`\`

### Disaster Recovery

1. **Recovery Planning**:
   - Document all critical systems and dependencies
   - Create step-by-step recovery procedures
   - Test recovery procedures regularly
   - Maintain offline copies of critical information
   - Establish communication protocols

2. **Recovery Testing**:
   \`\`\`bash
   # Test backup integrity
   gpg --decrypt backup.tar.gz.gpg | tar -tzf - > /dev/null
   
   # Verify file checksums
   sha256sum backup.tar.gz.gpg > backup.sha256
   sha256sum -c backup.sha256
   \`\`\`

## Compliance and Auditing

### Security Auditing

1. **Regular Security Audits**:
   \`\`\`bash
   # System audit tools
   sudo apt install lynis rkhunter chkrootkit
   
   # Run security audit
   sudo lynis audit system
   
   # Check for rootkits
   sudo rkhunter --check
   sudo chkrootkit
   \`\`\`

2. **Log Analysis**:
   \`\`\`bash
   # Analyze authentication logs
   sudo grep "authentication failure" /var/log/auth.log
   
   # Check for privilege escalation
   sudo grep "sudo" /var/log/auth.log
   
   # Monitor file access
   sudo ausearch -f /etc/passwd
   \`\`\`

### Compliance Requirements

1. **Data Protection**:
   - Implement data encryption at rest and in transit
   - Regular data backup and recovery testing
   - Access control and user management
   - Data retention and deletion policies

2. **Security Documentation**:
   - Maintain security policies and procedures
   - Document security incidents and responses
   - Keep audit trails and access logs
   - Regular security training and awareness

## Security Monitoring

### Real-time Monitoring

1. **System Monitoring**:
   \`\`\`bash
   # Install monitoring tools
   sudo apt install htop iotop netstat-nat
   
   # Monitor system resources
   htop
   iotop
   netstat -tulpn
   \`\`\`

2. **Log Monitoring**:
   \`\`\`bash
   # Real-time log monitoring
   sudo tail -f /var/log/syslog
   sudo tail -f /var/log/auth.log
   sudo tail -f /var/log/nginx/access.log
   \`\`\`

### Alerting and Notifications

1. **Email Alerts**:
   \`\`\`bash
   # Install mail utilities
   sudo apt install mailutils
   
   # Configure alert script
   #!/bin/bash
   if [ $(df / | tail -1 | awk '{print $5}' | sed 's/%//') -gt 90 ]; then
       echo "Disk usage is above 90%" | mail -s "Disk Alert" admin@example.com
   fi
   \`\`\`

2. **Automated Response**:
   \`\`\`bash
   # Automated security response script
   #!/bin/bash
   
   # Check for suspicious activity
   FAILED_LOGINS=$(grep "Failed password" /var/log/auth.log | wc -l)
   
   if [ $FAILED_LOGINS -gt 10 ]; then
       # Block suspicious IPs
       grep "Failed password" /var/log/auth.log | \
       awk '{print $11}' | sort | uniq -c | sort -nr | \
       head -5 | awk '$1 > 3 {print $2}' | \
       while read ip; do
           ufw deny from $ip
       done
       
       # Send alert
       echo "Blocked suspicious IPs due to failed login attempts" | \
       mail -s "Security Alert" admin@example.com
   fi
   \`\`\`

## Incident Response

### Security Incident Procedures

1. **Immediate Response**:
   - Isolate affected systems
   - Preserve evidence and logs
   - Assess the scope of the incident
   - Notify relevant stakeholders
   - Begin containment procedures

2. **Investigation Process**:
   - Collect and analyze logs
   - Identify attack vectors
   - Assess data compromise
   - Document findings
   - Implement remediation

3. **Recovery and Lessons Learned**:
   - Restore systems from clean backups
   - Apply security patches
   - Update security procedures
   - Conduct post-incident review
   - Improve security measures

## Security Tools and Resources

### Essential Security Tools

1. **System Security**:
   - **Lynis**: Security auditing tool
   - **RKHunter**: Rootkit detection
   - **ClamAV**: Antivirus scanner
   - **AIDE**: File integrity checker

2. **Network Security**:
   - **Nmap**: Network discovery and security auditing
   - **Wireshark**: Network protocol analyzer
   - **Fail2Ban**: Intrusion prevention
   - **Suricata**: Network threat detection

3. **Web Security**:
   - **ModSecurity**: Web application firewall
   - **OWASP ZAP**: Web application security scanner
   - **Nikto**: Web server scanner
   - **SSL Labs**: SSL/TLS configuration testing

### Security Resources

1. **Documentation and Guides**:
   - NIST Cybersecurity Framework
   - CIS Security Controls
   - OWASP Security Guidelines
   - Linux Security Documentation

2. **Threat Intelligence**:
   - CVE Database
   - Security advisories
   - Threat intelligence feeds
   - Security research publications

## Getting Help with Security

If you need assistance with security:

- **Emergency Security Issues**: Contact support immediately
- **Security Consultations**: Schedule security review sessions
- **Best Practices**: Review our security knowledge base
- **Compliance Questions**: Consult with our compliance team
- **Security Training**: Access our security training resources

### When to Contact Support

- Suspected security breaches
- Unusual system behavior
- Failed security audits
- Compliance requirements
- Complex security configurations

Remember: Security is an ongoing process, not a one-time setup. Regular monitoring, updates, and improvements are essential for maintaining a secure environment.`
      },
      {
        title: 'Two-Factor Authentication Setup',
        slug: 'two-factor-authentication-setup',
        categorySlug: 'security-access',
        displayOrder: 2,
        content: `# Two-Factor Authentication Setup

Two-Factor Authentication (2FA) adds an essential layer of security to your SkyPANEL account. This guide will walk you through setting up and managing 2FA.

## What is Two-Factor Authentication?

Two-Factor Authentication requires two different authentication factors:
1. **Something you know** (password)
2. **Something you have** (mobile device with authenticator app)

This significantly reduces the risk of unauthorized access, even if your password is compromised.

## Setting Up 2FA

### Step 1: Choose an Authenticator App

Recommended authenticator apps:
- **Google Authenticator** (iOS/Android)
- **Authy** (iOS/Android/Desktop) - Recommended for backup features
- **Microsoft Authenticator** (iOS/Android)
- **1Password** (Premium password manager with 2FA)
- **Bitwarden** (Free/Premium password manager with 2FA)

### Step 2: Enable 2FA in SkyPANEL

1. **Access Security Settings**:
   - Log into your SkyPANEL account
   - Navigate to **Account Settings** > **Security**
   - Click **Two-Factor Authentication**

2. **Start Setup Process**:
   - Click **Enable Two-Factor Authentication**
   - You'll see a QR code and setup key
   - Keep this page open while setting up your app

### Step 3: Configure Your Authenticator App

1. **Scan QR Code**:
   - Open your authenticator app
   - Tap **Add Account** or **+**
   - Scan the QR code displayed in SkyPANEL
   - The account will be added automatically

2. **Manual Entry** (if QR code doesn't work):
   - Choose **Enter Setup Key Manually**
   - Enter account name: "SkyPANEL"
   - Enter the setup key shown in SkyPANEL
   - Select **Time-based** token type

### Step 4: Verify Setup

1. **Enter Verification Code**:
   - Your authenticator app will generate a 6-digit code
   - Enter this code in the SkyPANEL verification field
   - Click **Verify and Enable**

2. **Save Backup Codes**:
   - You'll receive 10 backup codes
   - **Save these codes securely** - they're your only way to access your account if you lose your device
   - Print them or store in a password manager
   - Each code can only be used once

## Using 2FA for Login

### Normal Login Process

1. **Enter Credentials**:
   - Go to SkyPANEL login page
   - Enter your username and password
   - Click **Sign In**

2. **Enter 2FA Code**:
   - Open your authenticator app
   - Find your SkyPANEL account
   - Enter the current 6-digit code
   - Click **Verify**

### Using Backup Codes

If you don't have access to your authenticator app:

1. **Access Backup Codes**:
   - Click **Use Backup Code** on the 2FA prompt
   - Enter one of your saved backup codes
   - Click **Verify**

2. **After Using Backup Code**:
   - You'll be logged in successfully
   - Consider setting up 2FA on a new device
   - Generate new backup codes if running low

## Managing 2FA

### Adding Additional Devices

1. **Multiple Authenticators**:
   - You can set up the same account on multiple devices
   - Use the same QR code or setup key
   - All devices will generate the same codes

2. **Family/Team Setup**:
   - Each person should have their own SkyPANEL account
   - Don't share 2FA codes between users
   - Use team management features for shared access

### Regenerating Backup Codes

1. **When to Regenerate**:
   - Used several backup codes
   - Suspect codes may be compromised
   - Regular security maintenance (annually)

2. **Regeneration Process**:
   - Go to **Account Settings** > **Security**
   - Click **Regenerate Backup Codes**
   - Save the new codes securely
   - Old codes will no longer work

### Disabling 2FA

**Warning**: Only disable 2FA if absolutely necessary, as it significantly reduces account security.

1. **Disable Process**:
   - Go to **Account Settings** > **Security**
   - Click **Disable Two-Factor Authentication**
   - Enter your current password
   - Enter a 2FA code or backup code
   - Confirm disabling

2. **Re-enabling**:
   - You'll need to set up 2FA again from scratch
   - New QR code and backup codes will be generated
   - Previous authenticator entries will no longer work

## Troubleshooting 2FA

### Common Issues

1. **Codes Not Working**:
   - **Check Time Sync**: Ensure your device time is correct
   - **Wait for New Code**: Codes change every 30 seconds
   - **Try Backup Code**: Use a backup code if available
   - **Contact Support**: If all else fails

2. **Lost Device**:
   - **Use Backup Codes**: Access your saved backup codes
   - **Contact Support**: If no backup codes available
   - **Provide Identity Verification**: May be required for account recovery

3. **App Issues**:
   - **Reinstall App**: Delete and reinstall authenticator app
   - **Re-add Account**: Set up SkyPANEL account again
   - **Check App Updates**: Ensure app is up to date

### Time Synchronization

2FA codes are time-based, so accurate time is crucial:

1. **Mobile Devices**:
   - Enable automatic time/date
   - Check timezone settings
   - Restart device if time seems wrong

2. **Computer Clocks**:
   - Sync with internet time servers
   - Check timezone configuration
   - Update system time regularly

### Account Recovery

If you're completely locked out:

1. **Contact Support**:
   - Email: support@skypanel.com
   - Include: Account email, last known password
   - Be prepared for identity verification

2. **Identity Verification**:
   - Government-issued ID
   - Account creation details
   - Recent billing information
   - Previous support ticket numbers

## 2FA Best Practices

### Security Best Practices

1. **Backup Strategy**:
   - Save backup codes in multiple secure locations
   - Consider physical copies in a safe
   - Use encrypted password manager storage
   - Never store codes in plain text files

2. **Device Security**:
   - Use device lock screens (PIN, password, biometric)
   - Keep authenticator apps updated
   - Don't screenshot 2FA codes
   - Log out of shared devices

3. **Regular Maintenance**:
   - Review 2FA setup quarterly
   - Update backup codes annually
   - Remove old/unused devices
   - Test backup code access

### Organizational 2FA

1. **Team Management**:
   - Require 2FA for all team members
   - Provide 2FA setup training
   - Maintain emergency access procedures
   - Document 2FA policies

2. **Business Continuity**:
   - Multiple administrators with 2FA
   - Secure backup code storage
   - Emergency contact procedures
   - Regular access reviews

## Advanced 2FA Options

### Hardware Security Keys

For maximum security, consider hardware keys:

1. **Supported Keys**:
   - YubiKey (USB, NFC, Lightning)
   - Google Titan Security Key
   - Feitian ePass FIDO

2. **Setup Process**:
   - Purchase compatible security key
   - Enable in SkyPANEL security settings
   - Register key with your account
   - Test key functionality

### SMS Backup (Where Available)

Some regions support SMS as a backup method:

1. **Setup**:
   - Verify phone number
   - Enable SMS backup in settings
   - Test SMS delivery

2. **Limitations**:
   - Less secure than authenticator apps
   - Dependent on cellular service
   - May have delivery delays
   - Not available in all regions

## Integration with Other Services

### Password Managers

Many password managers include 2FA features:

1. **Benefits**:
   - Centralized 2FA management
   - Automatic backup and sync
   - Cross-device availability
   - Enhanced security features

2. **Popular Options**:
   - 1Password (Premium)
   - Bitwarden (Free/Premium)
   - LastPass (Premium)
   - Dashlane (Premium)

### API Access with 2FA

When using APIs with 2FA enabled:

1. **API Keys**:
   - Generate dedicated API keys
   - API keys bypass 2FA for automation
   - Restrict API key permissions
   - Monitor API key usage

2. **Application Passwords**:
   - Some integrations may require app passwords
   - Generate in security settings
   - Use unique passwords per application
   - Revoke unused app passwords

## Getting Help

If you need assistance with 2FA:

- **Setup Issues**: Check our step-by-step video guides
- **Technical Problems**: Submit a support ticket
- **Account Lockout**: Contact emergency support
- **Best Practices**: Review our security documentation

### Emergency Contact

For urgent 2FA issues:
- **Email**: security@skypanel.com
- **Phone**: Available to verified account holders
- **Live Chat**: For immediate assistance

Remember: 2FA is one of the most effective ways to protect your account. The small inconvenience is far outweighed by the security benefits!`
      },

      // Billing & Payments
      {
        title: 'Understanding Your Billing',
        slug: 'understanding-your-billing',
        categorySlug: 'billing-payments',
        displayOrder: 1,
        content: `# Understanding Your Billing

This guide explains how billing works in SkyPANEL, including pricing models, payment methods, and how to manage your account billing.

## Billing Overview

### How Billing Works

1. **Monthly Billing Cycle**:
   - Billing occurs on the same date each month
   - Charges are calculated based on resource usage
   - Invoices are generated automatically
   - Payment is processed using your default payment method

2. **Hourly Resource Billing**:
   - Servers are billed hourly when running
   - Stopped servers incur minimal storage charges
   - Destroyed servers stop all billing immediately
   - Partial hours are billed as full hours

3. **Resource-Based Pricing**:
   - **CPU**: Charged per vCPU core
   - **RAM**: Charged per GB of memory
   - **Storage**: Charged per GB of disk space
   - **Bandwidth**: Unmetered on all plans
   - **Additional Services**: DNS, backups, monitoring

### Billing Components

1. **Server Resources**:
   - Base server configuration (CPU, RAM, Storage)
   - Additional storage volumes
   - Premium features (SSD vs NVMe storage)
   - Operating system licensing (Windows Server)

2. **Network Services**:
   - Additional IP addresses
   - Load balancer usage
   - CDN bandwidth (if applicable)
   - DDoS protection (premium tiers)

3. **Management Services**:
   - Automated backups
   - Enhanced monitoring
   - Priority support
   - Managed services

## Viewing Your Bills

### Accessing Billing Information

1. **Billing Dashboard**:
   - Navigate to **Billing** in the main menu
   - View current balance and usage
   - See upcoming charges
   - Access payment history

2. **Current Usage**:
   - Real-time resource usage
   - Estimated monthly charges
   - Resource breakdown by service
   - Usage trends and projections

### Invoice Details

1. **Invoice Components**:
   - **Service Period**: Billing period covered
   - **Resource Usage**: Detailed breakdown of usage
   - **Line Items**: Individual charges for each service
   - **Taxes**: Applicable taxes based on your location
   - **Total Amount**: Final amount charged

2. **Understanding Line Items**:
   \`\`\`
   Server: web-server-01
   - 2 vCPU × 720 hours × $0.015/hour = $21.60
   - 4GB RAM × 720 hours × $0.005/hour = $14.40
   - 80GB SSD Storage × 720 hours × $0.0001/hour = $5.76
   Total Server Cost: $41.76
   \`\`\`

### Downloading Invoices

1. **PDF Invoices**:
   - Click **Download PDF** next to any invoice
   - Invoices include all necessary tax information
   - Suitable for accounting and expense reporting
   - Available immediately after billing

2. **CSV Export**:
   - Export billing data for analysis
   - Includes detailed usage metrics
   - Compatible with spreadsheet applications
   - Useful for cost optimization analysis

## Payment Methods

### Supported Payment Methods

1. **Credit/Debit Cards**:
   - Visa, MasterCard, American Express
   - Automatic monthly charging
   - Secure tokenized storage
   - International cards accepted

2. **PayPal**:
   - Link your PayPal account
   - Automatic payment processing
   - PayPal balance or linked payment methods
   - Additional buyer protection

### Managing Payment Methods

1. **Adding Payment Methods**:
   - Go to **Billing** > **Payment Methods**
   - Click **Add Payment Method**
   - Enter payment information securely
   - Verify the payment method

2. **Setting Default Payment Method**:
   - Select your preferred payment method
   - Click **Set as Default**
   - All future charges will use this method
   - Backup methods can be configured

3. **Updating Payment Information**:
   - Edit existing payment methods
   - Update expiration dates
   - Change billing addresses
   - Remove old payment methods

## Account Credits and Prepayment

### Account Credits

1. **How Credits Work**:
   - Credits are applied before charging payment methods
   - Promotional credits have expiration dates
   - Service credits for downtime compensation
   - Refund credits for cancelled services

2. **Adding Credits**:
   - Purchase prepaid credits
   - Receive promotional credits
   - Referral program credits
   - Support-issued credits

### Prepayment Options

1. **Benefits of Prepayment**:
   - Avoid monthly payment processing
   - Budget control and cost management
   - Potential volume discounts
   - Simplified accounting

2. **Prepayment Process**:
   - Go to **Billing** > **Add Credits**
   - Choose prepayment amount
   - Complete payment transaction
   - Credits appear immediately

## Billing Alerts and Notifications

### Setting Up Alerts

1. **Usage Alerts**:
   - Set spending thresholds
   - Receive notifications at 50%, 80%, 100% of budget
   - Email and SMS notifications available
   - Prevent unexpected charges

2. **Payment Alerts**:
   - Payment success confirmations
   - Payment failure notifications
   - Upcoming payment reminders
   - Credit balance warnings

### Managing Notifications

1. **Notification Preferences**:
   - Go to **Account Settings** > **Notifications**
   - Choose notification types
   - Set delivery methods (email, SMS)
   - Configure frequency settings

2. **Team Notifications**:
   - Add multiple notification recipients
   - Role-based notification settings
   - Billing admin notifications
   - Department-specific alerts

## Cost Optimization

### Monitoring Usage

1. **Usage Analytics**:
   - View detailed resource usage graphs
   - Identify usage patterns and trends
   - Compare costs across different periods
   - Analyze cost per service

2. **Cost Breakdown**:
   - Server-by-server cost analysis
   - Service category breakdowns
   - Geographic cost distribution
   - Time-based usage patterns

### Optimization Strategies

1. **Right-Sizing Resources**:
   - Monitor actual resource utilization
   - Downgrade over-provisioned servers
   - Upgrade under-performing servers
   - Use monitoring data for decisions

2. **Scheduling and Automation**:
   - Schedule non-production servers
   - Automatic shutdown during off-hours
   - Scale resources based on demand
   - Use automation for cost control

3. **Reserved Instances** (Enterprise):
   - Commit to longer terms for discounts
   - Significant savings for stable workloads
   - Flexible payment options
   - Transferable between projects

## Billing Issues and Support

### Common Billing Issues

1. **Payment Failures**:
   - **Insufficient Funds**: Add funds to payment method
   - **Expired Cards**: Update payment method
   - **Bank Blocks**: Contact your bank
   - **Technical Issues**: Contact our support

2. **Unexpected Charges**:
   - Review detailed usage reports
   - Check for forgotten running services
   - Verify resource configurations
   - Contact support for clarification

3. **Billing Disputes**:
   - Submit detailed dispute information
   - Provide supporting documentation
   - Allow 5-10 business days for resolution
   - Escalation options available

### Getting Billing Support

1. **Self-Service Options**:
   - Comprehensive billing FAQ
   - Usage calculators and estimators
   - Billing tutorials and guides
   - Community forums

2. **Direct Support**:
   - **Email**: billing@skypanel.com
   - **Live Chat**: Available 24/7
   - **Phone Support**: For enterprise customers
   - **Support Tickets**: Detailed billing inquiries

### Billing Support Response Times

1. **Standard Support**:
   - Email responses within 24 hours
   - Live chat available during business hours
   - Non-urgent billing questions

2. **Priority Support**:
   - Immediate response for payment issues
   - 24/7 support for billing emergencies
   - Dedicated billing specialists
   - Available for premium accounts

## Tax Information

### Tax Compliance

1. **Automatic Tax Calculation**:
   - Taxes calculated based on billing address
   - VAT for EU customers
   - Sales tax for US customers
   - GST for applicable regions

2. **Tax Documentation**:
   - Tax-compliant invoices
   - VAT registration numbers
   - Tax exemption certificates
   - Detailed tax breakdowns

### Managing Tax Information

1. **Updating Tax Details**:
   - Go to **Billing** > **Tax Information**
   - Update billing address
   - Add tax exemption certificates
   - Verify tax registration numbers

2. **Tax Exemptions**:
   - Upload exemption certificates
   - Provide tax-exempt organization details
   - Verify exemption status
   - Automatic application to future bills

## Enterprise Billing Features

### Advanced Billing Options

1. **Consolidated Billing**:
   - Multiple accounts on single invoice
   - Centralized payment processing
   - Departmental cost allocation
   - Simplified accounting

2. **Purchase Orders**:
   - PO-based billing process
   - Net 30/60/90 payment terms
   - Custom billing cycles
   - Approval workflows

3. **Cost Centers**:
   - Allocate costs to departments
   - Project-based billing
   - Custom reporting
   - Budget management

### Enterprise Support

1. **Dedicated Account Management**:
   - Personal account manager
   - Custom billing arrangements
   - Volume discount negotiations
   - Strategic planning support

2. **Custom Reporting**:
   - Tailored billing reports
   - API access to billing data
   - Integration with accounting systems
   - Real-time usage dashboards

## Best Practices

### Billing Management

1. **Regular Monitoring**:
   - Review bills monthly
   - Set up usage alerts
   - Monitor resource utilization
   - Track spending trends

2. **Payment Security**:
   - Use secure payment methods
   - Keep payment information updated
   - Monitor for unauthorized charges
   - Enable billing notifications

3. **Cost Control**:
   - Set spending budgets
   - Use resource scheduling
   - Regular cost optimization reviews
   - Implement approval processes

### Documentation

1. **Record Keeping**:
   - Download and store invoices
   - Maintain payment records
   - Document cost optimization efforts
   - Track budget vs. actual spending

2. **Audit Preparation**:
   - Organize billing documentation
   - Maintain tax compliance records
   - Document business justifications
   - Prepare cost allocation reports

Understanding your billing helps you make informed decisions about your hosting costs and ensures you get the best value from your SkyPANEL services.`
      },

      // Support & Troubleshooting
      {
        title: 'Getting Support',
        slug: 'getting-support',
        categorySlug: 'support-troubleshooting',
        displayOrder: 1,
        content: `# Getting Support

SkyPANEL offers comprehensive support to help you succeed with your hosting needs. This guide explains how to get help, what support options are available, and how to resolve common issues.

## Support Channels

### Available Support Options

1. **Live Chat**:
   - **Availability**: 24/7 for urgent issues
   - **Response Time**: Immediate to 5 minutes
   - **Best For**: Quick questions, immediate assistance
   - **Access**: Click the chat icon in your dashboard

2. **Support Tickets**:
   - **Availability**: 24/7 submission
   - **Response Time**: 1-4 hours (varies by priority)
   - **Best For**: Complex issues, detailed problems
   - **Access**: Support section in your dashboard

3. **Email Support**:
   - **General Support**: support@skypanel.com
   - **Billing Issues**: billing@skypanel.com
   - **Security Concerns**: security@skypanel.com
   - **Sales Inquiries**: sales@skypanel.com

4. **Knowledge Base**:
   - **Availability**: 24/7 self-service
   - **Content**: Comprehensive guides and tutorials
   - **Search**: Powerful search functionality
   - **Updates**: Regularly updated content

5. **Community Forums**:
   - **Peer Support**: Connect with other users
   - **Community Knowledge**: Shared experiences
   - **Expert Participation**: SkyPANEL staff involvement
   - **Topics**: Technical discussions, best practices

### Phone Support

**Enterprise customers only**:
- Dedicated phone support line
- Direct access to senior technicians
- Escalation procedures
- Emergency contact options

## Support Ticket System

### Creating Support Tickets

1. **Accessing the Ticket System**:
   - Log into your SkyPANEL account
   - Navigate to **Support** > **Submit Ticket**
   - Choose the appropriate category
   - Fill out the ticket form

2. **Ticket Categories**:
   - **Technical Issues**: Server problems, connectivity
   - **Billing Questions**: Payment, invoicing, credits
   - **Account Management**: Access, security, settings
   - **Feature Requests**: New features, improvements
   - **General Inquiries**: Questions, information

### Writing Effective Tickets

1. **Essential Information**:
   - **Clear Subject Line**: Summarize the issue
   - **Detailed Description**: Explain the problem thoroughly
   - **Steps to Reproduce**: How to recreate the issue
   - **Expected vs. Actual Results**: What should happen vs. what happens
   - **Error Messages**: Include exact error text
   - **Screenshots**: Visual evidence when helpful

2. **Technical Details**:
   - Server names and IP addresses
   - Operating system and version
   - Software versions and configurations
   - Recent changes or updates
   - Relevant log entries

3. **Example Good Ticket**:
   \`\`\`
   Subject: SSH Connection Timeout on web-server-01
   
   Description:
   I'm unable to connect to my server web-server-01 (IP: 192.168.1.100) 
   via SSH. The connection times out after about 30 seconds.
   
   Steps to Reproduce:
   1. Open terminal
   2. Run: ssh root@192.168.1.100
   3. Connection hangs and times out
   
   Expected Result: SSH connection should establish
   Actual Result: Connection timeout
   
   Error Message: "ssh: connect to host 192.168.1.100 port 22: Connection timed out"
   
   Additional Info:
   - This started happening yesterday around 3 PM
   - No recent changes to server configuration
   - Server appears to be running in the control panel
   - Web services on the server are still accessible
   \`\`\`

### Ticket Priority Levels

1. **Critical (P1)**:
   - Complete service outage
   - Security breaches
   - Data loss situations
   - **Response Time**: 15 minutes

2. **High (P2)**:
   - Significant service degradation
   - Multiple users affected
   - Business-critical issues
   - **Response Time**: 1 hour

3. **Medium (P3)**:
   - Single user issues
   - Non-critical functionality
   - Performance problems
   - **Response Time**: 4 hours

4. **Low (P4)**:
   - General questions
   - Feature requests
   - Documentation issues
   - **Response Time**: 24 hours

## Self-Service Resources

### Knowledge Base

1. **Comprehensive Documentation**:
   - Step-by-step tutorials
   - Troubleshooting guides
   - Best practices
   - Configuration examples

2. **Search Functionality**:
   - Keyword search
   - Category browsing
   - Popular articles
   - Recent updates

3. **Article Types**:
   - **How-to Guides**: Step-by-step instructions
   - **Troubleshooting**: Problem-solving guides
   - **Reference**: Technical specifications
   - **Best Practices**: Recommended approaches

### Video Tutorials

1. **Getting Started Series**:
   - Account setup and configuration
   - Creating your first server
   - Basic server management
   - DNS configuration

2. **Advanced Topics**:
   - Security hardening
   - Performance optimization
   - Backup and recovery
   - Automation and scripting

### API Documentation

1. **Complete API Reference**:
   - All available endpoints
   - Request/response examples
   - Authentication methods
   - Rate limiting information

2. **SDK and Libraries**:
   - Official SDKs for popular languages
   - Community-contributed libraries
   - Code examples and samples
   - Integration guides

## Common Issues and Solutions

### Server Connection Issues

1. **SSH Connection Problems**:
   \`\`\`bash
   # Check if SSH service is running
   systemctl status sshd
   
   # Restart SSH service
   systemctl restart sshd
   
   # Check firewall rules
   ufw status
   
   # Test connection from different location
   ssh -v user@server-ip
   \`\`\`

2. **Web Server Not Responding**:
   \`\`\`bash
   # Check web server status
   systemctl status nginx  # or apache2
   
   # Check if port is listening
   netstat -tlnp | grep :80
   
   # Check error logs
   tail -f /var/log/nginx/error.log
   
   # Test local connectivity
   curl -I http://localhost
   \`\`\`

### Performance Issues

1. **High CPU Usage**:
   \`\`\`bash
   # Identify CPU-intensive processes
   top
   htop
   
   # Check system load
   uptime
   
   # Analyze process activity
   ps aux --sort=-%cpu | head
   \`\`\`

2. **Memory Problems**:
   \`\`\`bash
   # Check memory usage
   free -h
   
   # Identify memory-intensive processes
   ps aux --sort=-%mem | head
   
   # Check for memory leaks
   cat /proc/meminfo
   \`\`\`

3. **Disk Space Issues**:
   \`\`\`bash
   # Check disk usage
   df -h
   
   # Find large files
   du -sh /* | sort -rh
   
   # Clean up log files
   journalctl --vacuum-time=7d
   \`\`\`

### Network Connectivity

1. **DNS Resolution Issues**:
   \`\`\`bash
   # Test DNS resolution
   nslookup example.com
   dig example.com
   
   # Check DNS configuration
   cat /etc/resolv.conf
   
   # Test with different DNS servers
   nslookup example.com 8.8.8.8
   \`\`\`

2. **Network Connectivity**:
   \`\`\`bash
   # Test basic connectivity
   ping google.com
   
   # Check routing
   traceroute google.com
   
   # Test specific ports
   telnet example.com 80
   nc -zv example.com 80
   \`\`\`

## Escalation Procedures

### When to Escalate

1. **Automatic Escalation**:
   - No response within SLA timeframe
   - Issue remains unresolved after initial response
   - Customer requests escalation

2. **Manual Escalation**:
   - Complex technical issues
   - Multiple service impacts
   - Billing disputes
   - Security incidents

### Escalation Process

1. **Level 1 Support**:
   - Initial ticket response
   - Basic troubleshooting
   - Common issue resolution
   - Documentation and guidance

2. **Level 2 Support**:
   - Advanced technical issues
   - System administration
   - Complex configurations
   - Performance optimization

3. **Level 3 Support**:
   - Engineering team involvement
   - Infrastructure issues
   - Product bugs and fixes
   - Custom solutions

4. **Management Escalation**:
   - Service level breaches
   - Unresolved critical issues
   - Customer satisfaction concerns
   - Contract and billing disputes

## Support Best Practices

### For Customers

1. **Before Contacting Support**:
   - Check the knowledge base
   - Review recent changes
   - Gather relevant information
   - Try basic troubleshooting

2. **When Contacting Support**:
   - Be specific and detailed
   - Include relevant technical information
   - Provide screenshots or logs
   - Specify urgency level accurately

3. **During Support Interaction**:
   - Respond promptly to requests
   - Test suggested solutions
   - Provide feedback on results
   - Ask questions if unclear

### Communication Guidelines

1. **Professional Communication**:
   - Be respectful and patient
   - Provide clear, factual information
   - Avoid emotional language
   - Focus on problem resolution

2. **Effective Collaboration**:
   - Work with support team
   - Follow suggested procedures
   - Provide requested information
   - Test solutions thoroughly

## Emergency Support

### Critical Issue Response

1. **What Constitutes an Emergency**:
   - Complete service outage
   - Security breaches
   - Data loss or corruption
   - Payment processing failures

2. **Emergency Contact Methods**:
   - Mark tickets as "Critical"
   - Use live chat for immediate response
   - Call emergency phone line (Enterprise)
   - Email security@skypanel.com for security issues

### Emergency Response Process

1. **Immediate Response**:
   - Acknowledgment within 15 minutes
   - Initial assessment and triage
   - Temporary workarounds if available
   - Regular status updates

2. **Resolution Process**:
   - Dedicated engineer assignment
   - Continuous monitoring
   - Root cause analysis
   - Permanent solution implementation
   - Post-incident review

## Feedback and Improvement

### Providing Feedback

1. **Support Experience Surveys**:
   - Automatic surveys after ticket closure
   - Rate support quality and responsiveness
   - Provide specific feedback
   - Suggest improvements

2. **Feature Requests**:
   - Submit through support tickets
   - Use community forums for discussion
   - Participate in user surveys
   - Join beta testing programs

### Continuous Improvement

1. **Support Quality Metrics**:
   - Response time monitoring
   - Resolution time tracking
   - Customer satisfaction scores
   - First-contact resolution rates

2. **Service Improvements**:
   - Regular process reviews
   - Staff training and development
   - Technology upgrades
   - Customer feedback integration

## Getting the Most from Support

### Building Relationships

1. **Regular Communication**:
   - Provide feedback on service
   - Participate in user communities
   - Attend webinars and events
   - Share success stories

2. **Proactive Engagement**:
   - Subscribe to status updates
   - Follow best practices
   - Keep systems updated
   - Monitor service health

### Long-term Success

1. **Knowledge Building**:
   - Learn from support interactions
   - Document solutions for future reference
   - Share knowledge with team members
   - Invest in training and education

2. **Partnership Approach**:
   - Work collaboratively with support
   - Provide constructive feedback
   - Participate in improvement initiatives
   - Recommend SkyPANEL to others

Remember: Our support team is here to help you succeed. Don't hesitate to reach out whenever you need assistance!`
      }
    ];

    let docsCreated = 0;
    let docsSkipped = 0;

    // Create documentation
    console.log('\n📄 Creating documentation...');
    for (const doc of documentation) {
      console.log(`🔍 Checking if document '${doc.title}' exists...`);
      
      const existingDoc = await db.select()
        .from(docs)
        .where(eq(docs.slug, doc.slug))
        .limit(1);
      
      if (existingDoc.length > 0) {
        console.log(`   ⚠️  Document '${doc.title}' already exists, skipping...`);
        docsSkipped++;
        continue;
      }
      
      const categoryId = categoryMap.get(doc.categorySlug);
      if (!categoryId) {
        console.log(`   ❌ Category '${doc.categorySlug}' not found for document '${doc.title}', skipping...`);
        docsSkipped++;
        continue;
      }
      
      console.log(`   ✨ Creating document '${doc.title}'...`);
      
      await db.insert(docs).values({
        title: doc.title,
        slug: doc.slug,
        content: doc.content,
        categoryId: categoryId,
        published: true,
        displayOrder: doc.displayOrder
      });
      
      docsCreated++;
      console.log(`   ✅ Document '${doc.title}' created successfully!`);
    }

    // Summary
    console.log('\n🎉 Client documentation population completed!');
    console.log(`\n📊 Summary:`);
    console.log(`   📁 Categories: ${categoriesCreated} created, ${categoriesSkipped} skipped`);
    console.log(`   📄 Documents: ${docsCreated} created, ${docsSkipped} skipped`);
    console.log(`\n✅ Your client documentation is now available at /docs`);
    
  } catch (error) {
    console.error('❌ Error populating client documentation:', error);
    process.exit(1);
  }
}

// Run the population script
populateClientDocumentation()
  .then(() => {
    console.log('\n🚀 Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });