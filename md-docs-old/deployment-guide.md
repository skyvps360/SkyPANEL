# Deployment Guide

## Overview
This guide provides comprehensive instructions for deploying SkyPANEL in various environments, including development, staging, and production.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Configuration](#configuration)
- [Database Setup](#database-setup)
- [Frontend Deployment](#frontend-deployment)
- [Backend Deployment](#backend-deployment)
- [CI/CD Pipeline](#ci-cd-pipeline)
- [Scaling](#scaling)
- [Monitoring](#monitoring)
- [Backup & Recovery](#backup--recovery)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements
- **CPU**: 2+ cores (4+ recommended for production)
- **Memory**: 4GB+ RAM (8GB+ recommended for production)
- **Storage**: 20GB+ free space
- **OS**: Linux/Windows Server 2019+/macOS
- **Docker**: 20.10+
- **Node.js**: 18.x LTS
- **PostgreSQL**: 14+
- **Redis**: 6.2+

### Required Accounts
- Cloud provider account (AWS/GCP/Azure)
- Docker Hub/GitHub Container Registry
- Domain name with DNS access
- SSL certificates (Let's Encrypt)

## Environment Setup

### Development
1. Clone the repository:
   ```bash
   git clone https://github.com/skyvps360/SkyPANEL.git
   cd SkyPANEL
   ```

2. Install dependencies:
   ```bash
   # Frontend
   cd client
   npm install
   
   # Backend
   cd ../server
   npm install
   ```

3. Set up environment variables (create `.env` files in both client and server directories)

### Production
1. Provision infrastructure (example for AWS):
   ```bash
   # Using Terraform
   terraform init
   terraform plan
   terraform apply
   ```

2. Set up managed services:
   - RDS for PostgreSQL
   - ElastiCache for Redis
   - S3 for storage
   - CloudFront for CDN

## Configuration

### Environment Variables
Create `.env` files with the following variables:

#### Backend (`.env`)
```env
# App
NODE_ENV=production
PORT=3001
APP_URL=https://api.yourdomain.com
FRONTEND_URL=https://yourdomain.com

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/skypanel
DB_SSL=false

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=24h

# Email
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your_sendgrid_key
EMAIL_FROM=noreply@yourdomain.com

# Storage
STORAGE_PROVIDER=s3
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
AWS_BUCKET=your-bucket-name

# Other
ENABLE_ANALYTICS=true
SENTRY_DSN=your_sentry_dsn
```

#### Frontend (`.env`)
```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXT_PUBLIC_GA_TRACKING_ID=UA-XXXXXXXXX-X
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
```

## Database Setup

### Initial Setup
1. Create database:
   ```sql
   CREATE DATABASE skypanel;
   CREATE USER skypanel WITH PASSWORD 'secure_password';
   GRANT ALL PRIVILEGES ON DATABASE skypanel TO skypanel;
   ```

2. Run migrations:
   ```bash
   cd server
   npx drizzle-kit migrate
   ```

3. Seed initial data:
   ```bash
   npm run db:seed
   ```

### Backups
Set up automated backups:
```bash
# Example backup script
pg_dump -U skypanel -d skypanel > backup_$(date +%Y%m%d).sql
```

## Frontend Deployment

### Development Server
```bash
cd client
npm run dev
```

### Production Build
```bash
# Build the application
npm run build

# Start the production server
npm run start
```

### Docker
```bash
docker build -t skypanel-frontend -f Dockerfile.frontend .
docker run -p 3000:3000 -d skypanel-frontend
```

## Backend Deployment

### Development
```bash
cd server
npm run dev
```

### Production
```bash
# Build the application
npm run build

# Start the production server
npm run start:prod
```

### Docker
```bash
docker build -t skypanel-backend -f Dockerfile.backend .
docker run -p 3001:3001 -d skypanel-backend
```

### PM2 (Process Manager)
```bash
# Install PM2 globally
npm install -g pm2

# Start application
pm2 start dist/main.js --name "skypanel-backend"

# Save process list
pm2 save

# Set up startup script
pm2 startup
```

## CI/CD Pipeline

### GitHub Actions (`.github/workflows/deploy.yml`)
```yaml
name: Deploy

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18.x'
    
    - name: Install dependencies
      run: |
        npm ci
        cd client && npm ci
        cd ../server && npm ci
    
    - name: Run tests
      run: |
        npm test
        cd client && npm test
    
    - name: Build
      run: |
        cd client && npm run build
        cd ../server && npm run build
    
    - name: Deploy to production
      if: github.ref == 'refs/heads/main'
      run: ./deploy.sh
      env:
        SSH_KEY: ${{ secrets.SSH_PRIVATE_KEY }}
        HOST: ${{ secrets.DEPLOY_HOST }}
        USER: ${{ secrets.DEPLOY_USER }}
```

## Scaling

### Horizontal Scaling
1. Set up load balancer (AWS ALB/NLB)
2. Configure auto-scaling groups
3. Use Redis for session storage
4. Implement database read replicas

### Caching
- Enable Redis caching
- Implement CDN for static assets
- Use HTTP caching headers

## Monitoring

### Application Monitoring
- **Logging**: ELK Stack or Papertrail
- **APM**: New Relic or Datadog
- **Error Tracking**: Sentry
- **Uptime**: UptimeRobot

### Infrastructure Monitoring
- **CloudWatch** (AWS)
- **Prometheus** + **Grafana**
- **Node Exporter** for server metrics

## Backup & Recovery

### Regular Backups
1. Database dumps (daily)
2. File system snapshots
3. Configuration backups
4. Off-site storage

### Recovery Plan
1. Document recovery procedures
2. Regular recovery testing
3. Point-in-time recovery options
4. Disaster recovery documentation

## Troubleshooting

### Common Issues
1. **Database Connection Issues**
   - Verify credentials
   - Check network connectivity
   - Ensure database is running

2. **Build Failures**
   - Check Node.js version
   - Clear npm cache
   - Verify dependencies

3. **Performance Problems**
   - Check database queries
   - Monitor server resources
   - Review application logs

### Getting Help
- Check the [FAQ](#)
- Search [GitHub Issues](#)
- Join our [Discord Server](#)
- Contact support@skyvps360.com

## Security Best Practices

### Application Security
- Regular dependency updates
- Security headers
- Rate limiting
- Input validation
- XSS/CSRF protection

### Infrastructure Security
- VPC configuration
- Security groups
- IAM roles and policies
- Regular security audits

## Upgrading

### Version Upgrades
1. Check release notes
2. Backup database
3. Update dependencies
4. Run migrations
5. Test thoroughly
6. Deploy to production

### Rolling Back
1. Revert code changes
2. Restore database backup
3. Rebuild and redeploy

## Support
For additional support, please contact:
- Email: support@skyvps360.com
- Documentation: [docs.skyvps360.com](#)
- Status Page: [status.skyvps360.com](#)

## Deployment Options

### Docker Deployment
- **Containerized**: Full application containerization
- **Scalable**: Easy horizontal scaling
- **Portable**: Deploy anywhere Docker runs
- **Isolated**: Separate environments for each component

### PM2 Deployment
- **Process Management**: Node.js process management
- **Cluster Mode**: Multi-core utilization
- **Auto-restart**: Automatic recovery from crashes
- **Monitoring**: Built-in monitoring and logging

### Cloudflare Wrangler Deployment
- **Edge Computing**: Global edge distribution
- **Low Latency**: Serve from 200+ locations worldwide
- **Automatic Scaling**: Handle traffic spikes automatically
- **DDoS Protection**: Built-in security and protection
- **Cost Effective**: Pay only for actual usage

## Cloudflare Wrangler Deployment

### Prerequisites
1. **Cloudflare Account**: Sign up at [cloudflare.com](https://cloudflare.com)
2. **Wrangler CLI**: Install with `npm install -g wrangler`
3. **Domain**: Add your domain to Cloudflare
4. **Workers Enabled**: Enable Workers in your Cloudflare dashboard

### Configuration
1. **Environment Variables**:
   ```bash
   CLOUDFLARE_ACCOUNT_ID=your_account_id
   CLOUDFLARE_ZONE_ID=your_zone_id
   CLOUDFLARE_ROUTE=your-domain.com/*
   ```

2. **Vite Configuration** (`vite.config.ts`):
   ```typescript
   export default defineConfig({
     // ... other config
     wrangler: {
       account_id: process.env.CLOUDFLARE_ACCOUNT_ID,
       zone_id: process.env.CLOUDFLARE_ZONE_ID,
       route: process.env.CLOUDFLARE_ROUTE,
     },
   });
   ```

### Deployment Steps
1. **Build Application**:
   ```bash
   npm run build
   ```

2. **Deploy to Cloudflare**:
   ```bash
   npm run wrangler:deploy
   ```

3. **Verify Deployment**:
   ```bash
   wrangler whoami
   npm run wrangler:tail
   ```

### Benefits
- **Global Distribution**: Deploy to 200+ edge locations
- **Automatic Scaling**: Handle traffic spikes without manual intervention
- **Built-in Security**: DDoS protection and SSL certificates
- **Cost Optimization**: Pay only for actual requests processed
