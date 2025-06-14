# SkyPANEL Deployment Guide

This guide provides detailed instructions for deploying the SkyPANEL application to various environments, including development, staging, and production. It covers different deployment options and best practices for ensuring a smooth deployment process.

## Table of Contents

1. [Deployment Overview](#deployment-overview)
2. [Prerequisites](#prerequisites)
3. [Environment Configuration](#environment-configuration)
4. [Database Setup](#database-setup)
5. [Building the Application](#building-the-application)
6. [Deployment Options](#deployment-options)
   - [VPS Deployment](#vps-deployment)
   - [Docker Deployment](#docker-deployment)
   - [Cloud Platform Deployment](#cloud-platform-deployment)
7. [Continuous Deployment](#continuous-deployment)
8. [Post-Deployment Verification](#post-deployment-verification)
9. [Rollback Procedures](#rollback-procedures)
10. [Maintenance Mode](#maintenance-mode)
11. [Monitoring and Logging](#monitoring-and-logging)
12. [Troubleshooting](#troubleshooting)

## Deployment Overview

SkyPANEL is a full-stack application with a React frontend and Node.js/Express backend. The deployment process involves:

1. Setting up the environment
2. Configuring the database
3. Building the application
4. Deploying to the target environment
5. Verifying the deployment
6. Setting up monitoring and logging

Different deployment options are available depending on your infrastructure and requirements.

## Prerequisites

Before deploying SkyPANEL, ensure you have:

1. **Access to deployment environment** with appropriate permissions
2. **Node.js** (v18 or higher) installed on the deployment server
3. **PostgreSQL** (v14 or higher) database server
4. **Git** for version control
5. **PM2** or similar process manager for production deployments
6. **SSL certificate** for secure HTTPS connections
7. **Domain name** configured to point to your server (for production)

## Environment Configuration

### Environment Variables

Create a `.env` file in the root directory with the appropriate configuration for your deployment environment:

```
# Database Configuration
DATABASE_URL=postgresql://username:password@hostname:5432/database_name

# Session Management
SESSION_SECRET=your-secure-session-secret

# Application Settings
PORT=5000
NODE_ENV=production
HOST=0.0.0.0

# External Service Integrations
VIRTFUSION_API_URL=https://your-virtfusion-instance/api/v1
VIRTFUSION_API_TOKEN=your-virtfusion-token

# PayPal Configuration
VITE_PAYPAL_SANDBOX=false
VITE_PAYPAL_CLIENT_ID=your-paypal-client-id
VITE_PAYPAL_SECRET=your-paypal-secret
VITE_PAYPAL_CURRENCY=USD

# Email Configuration
SMTP_HOST=your-smtp-host
SMTP_PORT=587
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password
SMTP_SECURE=false

# Frontend URL (for callbacks and links in emails)
FRONTEND_URL=https://your-domain.com
VITE_FRONTEND_URL=https://your-domain.com
```

### Environment-Specific Configuration

Create separate `.env` files for different environments:

- `.env.development` - Development environment
- `.env.staging` - Staging environment
- `.env.production` - Production environment

Use the appropriate file during deployment:

```bash
cp .env.production .env
```

## Database Setup

### Production Database Setup

1. Create a PostgreSQL database on your database server:

   ```sql
   CREATE DATABASE skypanel;
   CREATE USER skypanel_user WITH ENCRYPTED PASSWORD 'your-secure-password';
   GRANT ALL PRIVILEGES ON DATABASE skypanel TO skypanel_user;
   ```

2. Update the `DATABASE_URL` in your `.env` file to point to this database.

3. Apply the database schema:

   ```bash
   npm run db:push
   ```

### Database Migrations

For production deployments, it's recommended to use database migrations instead of direct schema pushes:

1. Generate a migration from your schema changes:

   ```bash
   npx drizzle-kit generate:pg
   ```

2. Apply the migration during deployment:

   ```bash
   node migrations/migrate.js
   ```

## Building the Application

### Production Build

To create a production build:

```bash
npm run build
```

This command:
1. Builds the React frontend with Vite
2. Bundles the Node.js backend with ESBuild
3. Outputs the built files to the `dist` directory

### Verifying the Build

After building, verify that the following files and directories exist:

- `dist/index.js` - The bundled backend entry point
- `dist/assets/` - Frontend assets (JS, CSS, images)
- `dist/index.html` - The main HTML file

## Deployment Options

### VPS Deployment

Deploying to a Virtual Private Server (VPS) gives you full control over the environment.

#### Manual Deployment

1. SSH into your server:

   ```bash
   ssh user@your-server-ip
   ```

2. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/SkyPANEL.git
   cd SkyPANEL
   ```

3. Install dependencies:

   ```bash
   npm install --production
   ```

4. Create and configure the `.env` file.

5. Build the application:

   ```bash
   npm run build
   ```

6. Start the application with PM2:

   ```bash
   npm run start:pm2
   ```

#### Automated Deployment Script

SkyPANEL includes a deployment script for VPS deployments:

```bash
npm run deploy:vps
```

This script:
1. Builds the application locally
2. Transfers the built files to the server using SCP
3. Installs production dependencies on the server
4. Restarts the application using PM2

To configure the deployment script, update the `deploy-vps.sh` file with your server details.

### Docker Deployment

Docker provides a consistent deployment environment across different platforms.

#### Building the Docker Image

1. Build the Docker image:

   ```bash
   docker build -t skypanel:latest .
   ```

2. Run the container:

   ```bash
   docker run -d -p 5000:5000 --env-file .env --name skypanel skypanel:latest
   ```

#### Docker Compose

For more complex setups with multiple services, use Docker Compose:

1. Create a `docker-compose.yml` file:

   ```yaml
   version: '3'
   services:
     app:
       build: .
       ports:
         - "5000:5000"
       env_file: .env
       depends_on:
         - db
       restart: always
     
     db:
       image: postgres:14
       volumes:
         - postgres_data:/var/lib/postgresql/data
       environment:
         POSTGRES_USER: postgres
         POSTGRES_PASSWORD: postgres
         POSTGRES_DB: skypanel
       ports:
         - "5432:5432"
   
   volumes:
     postgres_data:
   ```

2. Start the services:

   ```bash
   docker-compose up -d
   ```

### Cloud Platform Deployment

SkyPANEL can be deployed to various cloud platforms.

#### Deploying to AWS

1. **EC2 Deployment**:
   - Launch an EC2 instance with Amazon Linux 2
   - Install Node.js, Git, and PostgreSQL
   - Follow the VPS deployment steps

2. **Elastic Beanstalk Deployment**:
   - Create a new Elastic Beanstalk environment
   - Configure environment variables
   - Deploy the application using the EB CLI:
     ```bash
     eb init
     eb create
     eb deploy
     ```

#### Deploying to Azure

1. **Azure App Service**:
   - Create a new App Service
   - Configure environment variables
   - Deploy using Azure CLI:
     ```bash
     az webapp up --name your-app-name --resource-group your-resource-group
     ```

#### Deploying to Google Cloud

1. **Google App Engine**:
   - Create an `app.yaml` file:
     ```yaml
     runtime: nodejs18
     env: standard
     ```
   - Deploy using gcloud CLI:
     ```bash
     gcloud app deploy
     ```

## Continuous Deployment

### Setting Up CI/CD Pipeline

SkyPANEL can be configured for continuous deployment using GitHub Actions or similar CI/CD tools.

#### GitHub Actions Example

Create a `.github/workflows/deploy.yml` file:

```yaml
name: Deploy

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run tests
        run: npm test
        
      - name: Build application
        run: npm run build
        
      - name: Deploy to production
        run: npm run deploy:vps
        env:
          SSH_PRIVATE_KEY: ${{ secrets.SSH_PRIVATE_KEY }}
          SERVER_IP: ${{ secrets.SERVER_IP }}
          SERVER_USER: ${{ secrets.SERVER_USER }}
```

## Post-Deployment Verification

After deploying, verify that the application is running correctly:

### Health Check

1. Access the health check endpoint:

   ```bash
   curl https://your-domain.com/api/health
   ```

   Expected response: `{"status":"ok"}`

### Smoke Tests

Run basic smoke tests to verify critical functionality:

1. Check that the login page loads
2. Verify API endpoints are accessible
3. Test database connectivity
4. Ensure external integrations are working

### Automated Verification

SkyPANEL includes a health check script:

```bash
npm run health-check
```

This script verifies that the application is running and responding to requests.

## Rollback Procedures

If issues are detected after deployment, follow these rollback procedures:

### Rolling Back with Git

1. Identify the last stable version:

   ```bash
   git log --oneline
   ```

2. Checkout the stable version:

   ```bash
   git checkout <commit-hash>
   ```

3. Rebuild and redeploy:

   ```bash
   npm run build
   npm run deploy:vps
   ```

### Rolling Back with PM2

If using PM2 for process management:

1. List available versions:

   ```bash
   pm2 list
   ```

2. Rollback to the previous version:

   ```bash
   pm2 reloadLogs skypanel
   ```

### Database Rollbacks

If database changes need to be rolled back:

1. Restore from the most recent backup:

   ```bash
   pg_restore -d skypanel backup_file.dump
   ```

2. Or run a downgrade migration if available:

   ```bash
   node migrations/rollback.js
   ```

## Maintenance Mode

SkyPANEL includes a maintenance mode feature for performing updates with minimal disruption.

### Enabling Maintenance Mode

1. Through the admin interface:
   - Log in as an administrator
   - Navigate to Admin > Settings
   - Enable maintenance mode

2. Through the API:

   ```bash
   curl -X POST https://your-domain.com/api/admin/maintenance/enable \
     -H "Authorization: Bearer your-admin-token" \
     -H "Content-Type: application/json" \
     -d '{"message": "System maintenance in progress. Please check back later."}'
   ```

### Disabling Maintenance Mode

1. Through the admin interface:
   - Log in as an administrator
   - Navigate to Admin > Settings
   - Disable maintenance mode

2. Through the API:

   ```bash
   curl -X POST https://your-domain.com/api/admin/maintenance/disable \
     -H "Authorization: Bearer your-admin-token"
   ```

## Monitoring and Logging

### Setting Up Monitoring

SkyPANEL integrates with BetterStack for monitoring:

1. Create a BetterStack account
2. Add your API key to the `.env` file:

   ```
   BETTERSTACK_API_KEY=your-api-key
   ```

3. The application will automatically send metrics and logs to BetterStack.

### Log Management

Logs are managed through PM2 in production:

1. View logs:

   ```bash
   npm run logs:pm2
   ```

2. Save logs to a file:

   ```bash
   pm2 logs skypanel --out logs/app.log
   ```

3. Configure log rotation in PM2:

   ```bash
   pm2 install pm2-logrotate
   pm2 set pm2-logrotate:max_size 10M
   pm2 set pm2-logrotate:retain 7
   ```

## Troubleshooting

### Common Deployment Issues

1. **Application won't start**:
   - Check the logs: `npm run logs:pm2`
   - Verify environment variables are set correctly
   - Ensure the database is accessible
   - Check for port conflicts

2. **Database connection issues**:
   - Verify the `DATABASE_URL` is correct
   - Check database server is running
   - Ensure database user has proper permissions
   - Check network connectivity and firewall settings

3. **Frontend not loading**:
   - Verify the build process completed successfully
   - Check for JavaScript errors in the browser console
   - Ensure static files are being served correctly
   - Verify API endpoints are accessible

4. **External integrations not working**:
   - Check API keys and credentials
   - Verify network connectivity to external services
   - Check for rate limiting or IP restrictions
   - Review integration-specific logs

### Getting Help

If you encounter issues not covered in this guide:

1. Check the logs for error messages
2. Review the documentation for the specific component
3. Search for similar issues in the project's issue tracker
4. Reach out to the development team for assistance

---

This deployment guide should help you successfully deploy SkyPANEL to your desired environment. If you have any questions or need further assistance, please contact the development team.