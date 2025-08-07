# SkyPANEL Deployment Guide

This guide provides detailed instructions for deploying SkyPANEL in different environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development](#local-development)
3. [Production Deployment](#production-deployment)
   - [DigitalOcean App Platform](#digitalocean-app-platform)
   - [Other Platforms](#other-platforms)
4. [Environment Configuration](#environment-configuration)
5. [Database Setup](#database-setup)
6. [Monitoring and Maintenance](#monitoring-and-maintenance)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

- Node.js 18+ installed
- Git for version control
- Access to a PostgreSQL database
- PayPal developer account for billing integration

## Local Development

1. **Clone the repository**

   ```bash
   git clone https://github.com/skyvps360/SkyPANEL.git
   cd SkyPANEL
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env` file in the root directory:

   ```
   NODE_ENV=development
   PORT=3000
   DATABASE_URL=postgresql://username:password@localhost:5432/skypanel
   VITE_PAYPAL_CLIENT_ID=your_paypal_client_id
   VITE_PAYPAL_SECRET=your_paypal_secret
   ```

4. **Run database migrations**

   ```bash
   npm run db:push
   ```

5. **Start development server**

   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:3000`.

## Production Deployment

### DigitalOcean App Platform

SkyPANEL is optimized for deployment on DigitalOcean App Platform.

1. **Set up DigitalOcean App Platform**

   - Create a DigitalOcean account
   - Create a new App Platform application
   - Connect to your GitHub repository
   - Select the branch to deploy (usually `main`)

2. **Configure the application**

   - **Build Command:** `npm run build`
   - **Run Command:** `npm start`
   - **Environment:** Node.js 18+
   - **Instance Size:** Basic XXS (upgradeable as needed)

3. **Set environment variables**

   Configure the following environment variables in the DigitalOcean App Platform dashboard:

   ```
   NODE_ENV=production
   PORT=8080
   DATABASE_URL=your_database_connection_string
   VITE_PAYPAL_CLIENT_ID=your_paypal_client_id
   VITE_PAYPAL_SECRET=your_paypal_secret
   ```

4. **Deploy the application**

   Click the "Deploy" button in the DigitalOcean App Platform dashboard.

5. **Alternative: Use the app specification**

   You can use the provided `.do/app.yaml` file to configure your application:

   ```bash
   doctl apps create --spec .do/app.yaml
   ```

### Other Platforms

SkyPANEL can also be deployed to other platforms like Heroku, AWS, or traditional servers.

#### Heroku Deployment

1. **Create a Heroku app**

   ```bash
   heroku create skypanel-instance
   ```

2. **Set environment variables**

   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set VITE_PAYPAL_CLIENT_ID=your_paypal_client_id
   heroku config:set VITE_PAYPAL_SECRET=your_paypal_secret
   ```

3. **Add a database**

   ```bash
   heroku addons:create heroku-postgresql:hobby-dev
   ```

4. **Deploy the application**

   ```bash
   git push heroku main
   ```

#### Traditional Server Deployment

1. **Set up a server with Node.js 18+**

2. **Clone the repository**

   ```bash
   git clone https://github.com/skyvps360/SkyPANEL.git
   cd SkyPANEL
   ```

3. **Install dependencies**

   ```bash
   npm install --production
   ```

4. **Build the application**

   ```bash
   NODE_ENV=production npm run build
   ```

5. **Configure environment variables**

   Create a `.env` file or set system environment variables.

6. **Run database migrations**

   ```bash
   npm run db:push
   ```

7. **Start the application with PM2**

   ```bash
   pm2 start pm2.config.cjs
   ```

## Environment Configuration

### Required Environment Variables

- `NODE_ENV`: Set to `production` for production deployments
- `PORT`: The port the server will listen on
- `DATABASE_URL`: PostgreSQL connection string
- `VITE_PAYPAL_CLIENT_ID`: PayPal Client ID for billing
- `VITE_PAYPAL_SECRET`: PayPal Secret for billing

### Optional Environment Variables

- `SESSION_SECRET`: Secret for session encryption
- `SENDGRID_API_KEY`: For email notifications
- `LOG_LEVEL`: Logging level (default: info)

## Database Setup

SkyPANEL uses Drizzle ORM to manage the database:

1. **Create a PostgreSQL database**

2. **Run database migrations**

   ```bash
   NODE_ENV=production npm run db:push
   ```

3. **Database Backups**

   Set up regular backups of your database using platform-specific tools or PostgreSQL utilities:

   ```bash
   pg_dump -U username -d skypanel > backup.sql
   ```

## Monitoring and Maintenance

### PM2 Process Manager

SkyPANEL uses PM2 for process management in production:

```bash
# Start the application
pm2 start pm2.config.cjs

# Monitor the application
pm2 monit

# View logs
pm2 logs

# Restart the application
pm2 restart skypanel
```

### Log Management

- Check application logs in the deployment platform dashboard
- Configure log forwarding to a centralized logging service
- Monitor for error patterns and performance issues

### Updates and Maintenance

1. **Pull latest changes**

   ```bash
   git pull origin main
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Run database migrations**

   ```bash
   npm run db:push
   ```

4. **Rebuild and restart**

   ```bash
   npm run build
   pm2 restart skypanel
   ```

## Troubleshooting

### Common Issues

#### Build Failures

- **Symptom**: Build process fails
- **Solution**: 
  - Verify all environment variables are set correctly
  - Ensure Node.js 18+ is installed
  - Check that dependencies are properly categorized in package.json

#### Database Connection Issues

- **Symptom**: Application fails to connect to the database
- **Solution**:
  - Verify DATABASE_URL is correctly formatted
  - Check database server is running and accessible
  - Ensure database credentials are correct

#### Performance Problems

- **Symptom**: Application runs slowly or crashes
- **Solution**:
  - Increase server resources (memory, CPU)
  - Optimize database queries
  - Consider upgrading to a larger instance size
  - Monitor memory usage and implement garbage collection strategies

### Getting Help

- Check the GitHub repository issues
- Refer to the documentation in the `/docs` directory
- Check application logs for specific error messages