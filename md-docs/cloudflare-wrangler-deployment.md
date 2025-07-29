# Cloudflare Wrangler Deployment Guide

## Overview

SkyPANEL now supports deployment via Cloudflare Wrangler, enabling global edge distribution with low latency and automatic scaling. This deployment option provides enterprise-grade performance and security with minimal configuration.

## Prerequisites

### Cloudflare Account Setup
1. **Create Cloudflare Account**: Sign up at [cloudflare.com](https://cloudflare.com)
2. **Enable Workers**: Navigate to Workers & Pages in your Cloudflare dashboard
3. **Get Account ID**: Find your Account ID in the Cloudflare dashboard
4. **Create Zone**: Add your domain to Cloudflare (if not already added)
5. **Get Zone ID**: Note your Zone ID from the domain settings

### Local Development Setup
1. **Install Wrangler CLI**:
   ```bash
   npm install -g wrangler
   ```

2. **Login to Cloudflare**:
   ```bash
   wrangler login
   ```

3. **Verify Installation**:
   ```bash
   wrangler whoami
   ```

## Configuration

### Environment Variables

Add the following environment variables to your `.env` file:

```bash
# Cloudflare Configuration
CLOUDFLARE_ACCOUNT_ID=your_account_id_here
CLOUDFLARE_ZONE_ID=your_zone_id_here
CLOUDFLARE_ROUTE=your-domain.com/*
CLOUDFLARE_WORKER_NAME=skypanel-worker

# Application Configuration (same as other deployments)
DATABASE_URL=postgres://username:password@hostname:port/database
SESSION_SECRET=your_secure_random_string_here
VIRTFUSION_API_URL=https://your-virtfusion.com/api/v1
VIRTFUSION_API_KEY=your_virtfusion_api_key
# ... other environment variables
```

### Vite Configuration

Update your `vite.config.ts` to include Wrangler configuration:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // ... other configuration
  
  // Cloudflare Wrangler Configuration
  wrangler: {
    account_id: process.env.CLOUDFLARE_ACCOUNT_ID,
    zone_id: process.env.CLOUDFLARE_ZONE_ID,
    route: process.env.CLOUDFLARE_ROUTE,
    worker_name: process.env.CLOUDFLARE_WORKER_NAME || 'skypanel-worker',
  },
});
```

### Package.json Scripts

Add the following scripts to your `package.json`:

```json
{
  "scripts": {
    "wrangler": "wrangler run",
    "wrangler:deploy": "wrangler deploy",
    "wrangler:dev": "wrangler dev",
    "wrangler:tail": "wrangler tail"
  }
}
```

## Deployment Process

### 1. Build the Application

```bash
# Install dependencies
npm install

# Build for production
npm run build
```

### 2. Deploy to Cloudflare Workers

#### Development Deployment
```bash
# Deploy to development environment
npm run wrangler:dev
```

#### Production Deployment
```bash
# Deploy to production
npm run wrangler:deploy
```

### 3. Verify Deployment

```bash
# Check deployment status
wrangler whoami

# View deployment logs
npm run wrangler:tail
```

## Benefits of Cloudflare Deployment

### Performance
- **Global Edge Network**: Deploy to 200+ locations worldwide
- **Low Latency**: Serve content from the edge closest to users
- **Automatic Scaling**: Handle traffic spikes without manual intervention
- **CDN Integration**: Built-in content delivery network

### Security
- **DDoS Protection**: Automatic protection against distributed attacks
- **SSL/TLS**: Free SSL certificates with automatic renewal
- **WAF Integration**: Web Application Firewall protection
- **Bot Management**: Advanced bot detection and mitigation

### Cost Effectiveness
- **Pay-per-Use**: Only pay for actual requests processed
- **No Infrastructure**: No servers to manage or maintain
- **Predictable Pricing**: Clear pricing model with no hidden costs
- **Free Tier**: Generous free tier for development and testing

### Developer Experience
- **Simple Deployment**: One-command deployment process
- **Real-time Logs**: Live logging and monitoring
- **Easy Rollbacks**: Quick rollback to previous versions
- **Environment Management**: Separate dev/staging/production environments

## Advanced Configuration

### Custom Domains

Configure custom domains for your deployment:

```bash
# Add custom domain
wrangler route add your-domain.com/*

# Verify domain configuration
wrangler route list
```

### Environment Variables

Set environment variables for your Workers:

```bash
# Set environment variables
wrangler secret put DATABASE_URL
wrangler secret put SESSION_SECRET
wrangler secret put VIRTFUSION_API_KEY

# List current secrets
wrangler secret list
```

### Worker Configuration

Create a `wrangler.toml` file for advanced configuration:

```toml
name = "skypanel-worker"
account_id = "your_account_id"
zone_id = "your_zone_id"
route = "your-domain.com/*"

[env.production]
name = "skypanel-worker-prod"
route = "your-domain.com/*"

[env.staging]
name = "skypanel-worker-staging"
route = "staging.your-domain.com/*"

[build]
command = "npm run build"
```

## Monitoring and Analytics

### Cloudflare Analytics

Access analytics through the Cloudflare dashboard:

1. **Workers Analytics**: View request counts, errors, and performance
2. **Real-time Monitoring**: Live monitoring of your application
3. **Error Tracking**: Detailed error logs and debugging information
4. **Performance Metrics**: Response times and throughput statistics

### Logging

```bash
# View real-time logs
npm run wrangler:tail

# Filter logs by level
wrangler tail --format=pretty

# Export logs for analysis
wrangler tail --format=json > logs.json
```

## Troubleshooting

### Common Issues

#### Deployment Failures
```bash
# Check Wrangler status
wrangler whoami

# Verify configuration
wrangler config list

# Check for errors in build process
npm run build
```

#### Environment Variable Issues
```bash
# List current secrets
wrangler secret list

# Update secrets
wrangler secret put VARIABLE_NAME

# Remove secrets
wrangler secret delete VARIABLE_NAME
```

#### Domain Configuration Issues
```bash
# Check route configuration
wrangler route list

# Add missing routes
wrangler route add your-domain.com/*

# Verify DNS settings
wrangler dns list
```

### Performance Optimization

#### Worker Optimization
- **Bundle Size**: Keep worker bundle under 1MB for optimal performance
- **Cold Starts**: Minimize cold start times with efficient code
- **Memory Usage**: Monitor memory usage and optimize accordingly

#### Database Optimization
- **Connection Pooling**: Use connection pooling for database connections
- **Query Optimization**: Optimize database queries for edge deployment
- **Caching**: Implement appropriate caching strategies

## Security Best Practices

### Environment Variables
- **Secure Storage**: Use Wrangler secrets for sensitive data
- **Rotation**: Regularly rotate API keys and secrets
- **Access Control**: Limit access to production secrets

### Application Security
- **Input Validation**: Validate all user inputs
- **CORS Configuration**: Configure CORS properly for your domain
- **Rate Limiting**: Implement rate limiting for API endpoints

### Monitoring
- **Error Tracking**: Monitor and alert on errors
- **Performance Monitoring**: Track response times and throughput
- **Security Monitoring**: Monitor for suspicious activity

## Migration from Other Deployments

### From Docker Deployment
1. **Backup Data**: Ensure all data is backed up
2. **Update Environment**: Configure Cloudflare environment variables
3. **Test Deployment**: Deploy to staging environment first
4. **Update DNS**: Point domain to Cloudflare
5. **Monitor**: Monitor performance and functionality

### From PM2 Deployment
1. **Stop PM2**: Stop the PM2 process
2. **Configure Cloudflare**: Set up Cloudflare deployment
3. **Deploy**: Deploy to Cloudflare Workers
4. **Update DNS**: Update DNS records
5. **Verify**: Verify all functionality works correctly

## Cost Optimization

### Free Tier Limits
- **Requests**: 100,000 requests per day
- **CPU Time**: 10ms CPU time per request
- **Memory**: 128MB memory per request

### Paid Tier Pricing
- **Additional Requests**: $0.50 per million requests
- **CPU Time**: $12.50 per million CPU-milliseconds
- **Memory**: $0.000030 per GB-second

### Optimization Strategies
- **Caching**: Implement effective caching to reduce requests
- **Code Optimization**: Optimize code to reduce CPU time
- **Resource Management**: Efficiently manage memory usage

## Support and Resources

### Documentation
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)
- [SkyPANEL Documentation](https://github.com/skyvps360/SkyPANEL)

### Community Support
- **GitHub Issues**: Report bugs and request features
- **Discord Community**: Join our Discord server for real-time support
- **Cloudflare Community**: Cloudflare Workers community forums

### Professional Support
- **Cloudflare Support**: Enterprise support for Cloudflare services
- **SkyPANEL Support**: Professional support for SkyPANEL deployment

---

This guide provides comprehensive information for deploying SkyPANEL using Cloudflare Wrangler. For additional support or questions, please refer to the SkyPANEL documentation or community resources. 