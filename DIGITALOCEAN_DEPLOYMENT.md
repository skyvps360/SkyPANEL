# DigitalOcean App Platform Deployment Guide

## Overview
This guide provides instructions for deploying SkyPANEL to DigitalOcean App Platform.

## Prerequisites
- DigitalOcean account
- GitHub repository access
- Environment variables configured

## Deployment Steps

### 1. App Platform Configuration

Use the provided `.do/app.yaml` file or configure manually:

**Build Command:** `npm run build`
**Run Command:** `npm start`
**Environment:** Node.js
**Instance Size:** Basic XXS (can be upgraded as needed)

### 2. Required Environment Variables

Set these in your DigitalOcean App Platform dashboard:

```
NODE_ENV=production
PORT=8080
DATABASE_URL=your_database_connection_string
VITE_PAYPAL_CLIENT_ID=your_paypal_client_id
VITE_PAYPAL_SECRET=your_paypal_secret
# Add other environment variables as needed
```

### 3. Build Process

The build process consists of:
1. Frontend build with Vite (`vite build`)
2. Backend build with esbuild (`esbuild server/index.ts`)
3. Static assets served from `dist/public`
4. Server runs from `dist/index.js`

### 4. Optimizations Applied

- **Replit plugins disabled** in production builds
- **Bundle splitting** for better performance
- **Build-time dependencies** properly categorized
- **Memory optimizations** for large builds

### 5. Troubleshooting

**Build Failures:**
- Check that all environment variables are set
- Verify Node.js version compatibility (18+)
- Ensure build dependencies are in `dependencies`, not `devDependencies`

**Runtime Issues:**
- Check application logs in DigitalOcean dashboard
- Verify database connectivity
- Confirm all required environment variables are set

**Performance Issues:**
- Consider upgrading instance size
- Monitor memory usage during builds
- Check bundle size optimizations

## Monitoring

- Use DigitalOcean's built-in monitoring
- Check application logs regularly
- Monitor resource usage and scale as needed

## Support

For deployment issues, check:
1. DigitalOcean App Platform documentation
2. Application logs in the dashboard
3. GitHub repository issues
