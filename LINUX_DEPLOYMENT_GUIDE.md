# SkyPANEL Linux Deployment Guide

## Overview

This guide covers deploying SkyPANEL with the new **Server Synchronization System** on Linux environments. The system now includes comprehensive UUID cross-checking and external server management capabilities.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (or Neon.tech)
- PM2 process manager
- VirtFusion API access

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd SkyPANEL

# Install dependencies
npm install

# Build the application
npm run build

# Start with PM2
npm run start
```

## 🔧 Environment Configuration

Create a `.env` file with the required variables:

```bash
# Database Configuration
DATABASE_URL="postgresql://user:password@localhost:5432/skypanel"

# VirtFusion API Configuration
VIRTFUSION_API_URL="https://your-virtfusion-panel.com/api/v1"
VIRTFUSION_API_TOKEN="your-api-token"

# Server Configuration
PORT=3333
NODE_ENV=production

# Security
SESSION_SECRET="your-secure-session-secret"

# Optional: Additional integrations
PAYPAL_CLIENT_ID="your-paypal-client-id"
PAYPAL_CLIENT_SECRET="your-paypal-client-secret"
DISCORD_BOT_TOKEN="your-discord-bot-token"
GEMINI_API_KEY="your-gemini-api-key"
```

## 🔄 Server Synchronization System

### New Feature: UUID Cross-Checking

The server synchronization system addresses a critical issue where servers created directly in VirtFusion (outside of SkyPANEL) were not properly tracked or billed.

#### Key Capabilities

- **UUID Cross-Checking**: Verifies server UUIDs between VirtFusion and SkyPANEL
- **External Server Detection**: Identifies servers created outside SkyPANEL
- **Billing Integration**: Creates proper billing records for external servers
- **Real-time Status**: Provides live sync status and progress
- **Error Handling**: Comprehensive error reporting and recovery

#### How to Use

1. **Via Web Interface**:
   - Navigate to the Servers page
   - Click the "Sync Servers" button
   - Review sync status and results

2. **Via API** (for developers):
   ```bash
   # Sync current user's servers
   curl -X POST http://localhost:3333/api/user/servers/sync \
        -H "Content-Type: application/json" \
        -b "session-cookie"

   # Get sync status
   curl http://localhost:3333/api/user/servers/sync/status \
        -H "Content-Type: application/json" \
        -b "session-cookie"
   ```

3. **Testing the System**:
   ```bash
   # Test server synchronization
   npx tsx scripts/test-server-sync.ts
   ```

## 📦 Database Setup

### PostgreSQL (Local)

```bash
# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Create database and user
sudo -u postgres psql
CREATE DATABASE skypanel;
CREATE USER skypanel_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE skypanel TO skypanel_user;
\q

# Set DATABASE_URL
DATABASE_URL="postgresql://skypanel_user:secure_password@localhost:5432/skypanel"
```

### Neon.tech (Recommended)

1. Visit [neon.tech](https://neon.tech)
2. Create a new project
3. Copy the connection string
4. Set `DATABASE_URL` in your `.env` file

### Database Migration

The application will automatically run migrations on startup. For manual migration:

```bash
npm run db:push
```

## 🔧 PM2 Configuration

### Standard Configuration

The project includes a pre-configured `pm2.config.cjs` file optimized for Linux:

```bash
# Start with PM2
pm2 start pm2.config.cjs

# Monitor processes
pm2 monit

# View logs
pm2 logs skypanel

# Restart application
pm2 restart skypanel

# Stop application
pm2 stop skypanel

# Reload application (zero-downtime)
pm2 reload skypanel
```

### Custom PM2 Configuration

For custom configurations, modify `pm2.config.cjs`:

```javascript
module.exports = {
  apps: [
    {
      name: "skypanel",
      script: "npm",
      args: "run start",
      exec_mode: "cluster",
      instances: "max", // Use all CPU cores
      autorestart: true,
      watch: false,
      max_memory_restart: "2G",
      env: {
        NODE_ENV: "production",
        PORT: 3333
      }
    }
  ]
};
```

## 🔒 Security Setup

### Reverse Proxy (Nginx)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3333;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket support for VNC
    location /vnc-proxy {
        proxy_pass http://localhost:3333;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Firewall Configuration

```bash
# Enable UFW
sudo ufw enable

# Allow SSH
sudo ufw allow ssh

# Allow HTTP/HTTPS
sudo ufw allow 80
sudo ufw allow 443

# Allow SkyPANEL port (if not behind reverse proxy)
sudo ufw allow 3333

# Check status
sudo ufw status
```

## 📊 Monitoring & Maintenance

### Health Checks

```bash
# Check application status
curl http://localhost:3333/api/health

# Check PM2 status
pm2 status

# Check system resources
pm2 monit
```

### Log Management

```bash
# View application logs
pm2 logs skypanel

# View specific log files
tail -f logs/skypanel-out.log
tail -f logs/skypanel-error.log

# Rotate logs
pm2 install pm2-logrotate
```

### Backup Strategy

```bash
#!/bin/bash
# backup.sh - Database backup script

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/skypanel"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
pg_dump $DATABASE_URL > $BACKUP_DIR/skypanel_$DATE.sql

# Backup application files
tar -czf $BACKUP_DIR/skypanel_files_$DATE.tar.gz /path/to/skypanel

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
```

## 🔧 VirtFusion Integration

### API Configuration

1. **Get API Token**:
   - Login to VirtFusion admin panel
   - Navigate to Settings → API
   - Generate new API token

2. **Configure in SkyPANEL**:
   - Set `VIRTFUSION_API_URL` and `VIRTFUSION_API_TOKEN`
   - Test connection in Admin → Settings → VirtFusion

3. **User Linking**:
   - Users link their VirtFusion accounts via OAuth or manual linking
   - SkyPANEL uses `extRelationId` to map users

### Server Synchronization

The new synchronization system ensures consistency:

```bash
# Manual sync for all users (admin)
curl -X POST http://localhost:3333/api/admin/servers/sync \
     -H "Authorization: Bearer admin-token"

# Schedule automatic sync (crontab)
0 */6 * * * curl -s -X POST http://localhost:3333/api/admin/servers/sync
```

## 🚨 Troubleshooting

### Common Issues

1. **Database Connection Errors**:
   ```bash
   # Check DATABASE_URL format
   echo $DATABASE_URL
   
   # Test connection
   psql $DATABASE_URL -c "SELECT 1;"
   ```

2. **VirtFusion API Errors**:
   ```bash
   # Test API connection
   curl -H "Authorization: Bearer $VIRTFUSION_API_TOKEN" \
        $VIRTFUSION_API_URL/packages
   ```

3. **Server Sync Issues**:
   ```bash
   # Run sync test
   npx tsx scripts/test-server-sync.ts
   
   # Check logs
   pm2 logs skypanel | grep -i sync
   ```

4. **Port Already in Use**:
   ```bash
   # Check what's using port 3333
   sudo lsof -i :3333
   
   # Kill process if needed
   sudo kill -9 <PID>
   ```

### Performance Optimization

1. **Database Optimization**:
   ```sql
   -- Add indexes for frequently queried fields
   CREATE INDEX IF NOT EXISTS idx_servers_user_id ON virtfusion_hourly_billing(user_id);
   CREATE INDEX IF NOT EXISTS idx_servers_uuid ON virtfusion_hourly_billing(server_uuid);
   ```

2. **Memory Management**:
   ```bash
   # Adjust PM2 memory limits
   pm2 start pm2.config.cjs --max-memory-restart 2G
   ```

3. **Caching**:
   - Configure Redis for session storage
   - Enable browser caching via Nginx
   - Use CDN for static assets

## 📈 Scaling Considerations

### Horizontal Scaling

```javascript
// pm2.config.cjs - Multi-server setup
module.exports = {
  apps: [
    {
      name: "skypanel-web",
      script: "npm",
      args: "run start",
      instances: 4, // Adjust based on CPU cores
      exec_mode: "cluster"
    }
  ]
};
```

### Load Balancing

```nginx
upstream skypanel {
    server 127.0.0.1:3333;
    server 127.0.0.1:3334;
    server 127.0.0.1:3335;
    server 127.0.0.1:3336;
}

server {
    location / {
        proxy_pass http://skypanel;
    }
}
```

## 🔧 Advanced Configuration

### Custom Branding

1. **Configure Branding**:
   - Admin → Settings → Branding
   - Upload logo and set colors
   - Customize company information

2. **White-Label Setup**:
   - Remove SkyPANEL branding
   - Configure custom domain
   - Set up custom email templates

### Integration Setup

1. **PayPal Integration**:
   - Get PayPal API credentials
   - Configure webhooks
   - Test payment processing

2. **Discord Integration**:
   - Create Discord bot
   - Configure webhook notifications
   - Set up support channels

3. **Email Service**:
   - Configure SMTP settings
   - Set up email templates
   - Test notification delivery

## 📚 Additional Resources

- [API Documentation](md-docs/api-reference.md)
- [VirtFusion Integration Guide](md-docs/virtfusion-integration.md)
- [Server Synchronization System](md-docs/server-synchronization-system.md)
- [Discord Bot Setup](md-docs/discord-integration.md)
- [Billing System Guide](md-docs/billing-system.md)

## 🆘 Support

For technical support:

1. Check the [troubleshooting section](#troubleshooting)
2. Review application logs: `pm2 logs skypanel`
3. Run diagnostic tests: `npx tsx scripts/test-server-sync.ts`
4. Check system resources: `pm2 monit`

---

## 🎉 Success!

Your SkyPANEL installation with Server Synchronization System is now ready for production use on Linux! The system will automatically detect and synchronize external servers, ensuring proper billing and management through the SkyPANEL interface.

**Key Benefits of the Server Synchronization System:**
- ✅ **Automatic Detection**: Identifies servers created outside SkyPANEL
- ✅ **UUID Cross-Checking**: Ensures data consistency between systems
- ✅ **Billing Integration**: Proper billing for all servers
- ✅ **User-Friendly**: Simple web interface for synchronization
- ✅ **Admin Tools**: Comprehensive administrative controls
- ✅ **Error Handling**: Robust error reporting and recovery

The application should now be accessible at `http://your-domain.com` (or `http://localhost:3333` for local testing).
