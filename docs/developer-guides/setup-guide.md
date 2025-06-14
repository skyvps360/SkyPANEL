# SkyPANEL Developer Setup Guide

This guide provides step-by-step instructions for setting up a development environment for the SkyPANEL application. It covers prerequisites, installation, configuration, and running the application locally.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Repository Setup](#repository-setup)
3. [Environment Configuration](#environment-configuration)
4. [Database Setup](#database-setup)
5. [Installing Dependencies](#installing-dependencies)
6. [Running the Application](#running-the-application)
7. [Development Workflow](#development-workflow)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

Before setting up the SkyPANEL development environment, ensure you have the following prerequisites installed:

### Required Software

1. **Node.js** (v18 or higher)
   - Download from [nodejs.org](https://nodejs.org/)
   - Verify installation with `node --version`

2. **npm** (v8 or higher, comes with Node.js)
   - Verify installation with `npm --version`

3. **Git**
   - Download from [git-scm.com](https://git-scm.com/)
   - Verify installation with `git --version`

4. **PostgreSQL** (v14 or higher)
   - Download from [postgresql.org](https://www.postgresql.org/download/)
   - Verify installation with `psql --version`

5. **Visual Studio Code** (recommended, but optional)
   - Download from [code.visualstudio.com](https://code.visualstudio.com/)

### Recommended VS Code Extensions

If you're using Visual Studio Code, the following extensions are recommended:

- ESLint
- Prettier
- TypeScript and JavaScript Language Features
- Tailwind CSS IntelliSense
- PostgreSQL

## Repository Setup

### Cloning the Repository

1. Open a terminal or command prompt
2. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/SkyPANEL.git
   ```
3. Navigate to the project directory:
   ```bash
   cd SkyPANEL
   ```

### Repository Structure

The SkyPANEL repository is organized as follows:

- `/client`: Frontend React application
  - `/src`: Source code
    - `/components`: Reusable UI components
    - `/hooks`: Custom React hooks
    - `/lib`: Utility functions
    - `/pages`: Page components
    - `/styles`: CSS styles
    - `/types`: TypeScript type definitions
  - `/public`: Static assets

- `/server`: Backend Express application
  - `/services`: Backend services
  - `/middleware`: Express middleware
  - `/routes_new.ts`: API routes
  - `/index.ts`: Main server entry point

- `/shared`: Shared code between frontend and backend
  - `/schema.ts`: Database schema definitions

- `/migrations`: Database migration files
- `/scripts`: Utility scripts
- `/docs`: Documentation files
- `/diagrams`: System architecture diagrams
- `/test-scripts`: Test scripts and utilities

## Environment Configuration

### Setting Up Environment Variables

1. Create a `.env` file in the root directory by copying the example file:
   ```bash
   cp .env.example .env
   ```

2. Open the `.env` file in your editor and configure the following essential variables:
   ```
   # Database Configuration
   DATABASE_URL=postgresql://username:password@localhost:5432/skypanel

   # Session Management
   SESSION_SECRET=your-secret-key-here

   # Application Settings
   PORT=5000
   NODE_ENV=development
   ```

3. Additional configuration options are available in the `.env` file for:
   - PayPal integration
   - Email service
   - VirtFusion API
   - Google AI integration
   - Discord bot
   - DNS configuration

### Configuration for Local Development

For local development, you can use the following simplified configuration:

```
# Database Configuration
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/skypanel

# Session Management
SESSION_SECRET=dev-secret-key

# Application Settings
PORT=5000
NODE_ENV=development
HOST=localhost

# Disable optional integrations during development
VIRTFUSION_API_URL=
VIRTFUSION_API_TOKEN=
GOOGLE_AI_API_KEY=
BETTERSTACK_API_KEY=
```

## Database Setup

### Creating a Local PostgreSQL Database

1. Start PostgreSQL service if it's not already running
2. Connect to PostgreSQL:
   ```bash
   psql -U postgres
   ```
3. Create a new database:
   ```sql
   CREATE DATABASE skypanel;
   ```
4. Exit the PostgreSQL shell:
   ```sql
   \q
   ```

### Database Schema Setup

SkyPANEL uses Drizzle ORM for database management. To set up the database schema:

1. Ensure your `.env` file has the correct `DATABASE_URL`
2. Run the database push command:
   ```bash
   npm run db:push
   ```

This command will create all necessary tables based on the schema definitions in the `/shared/schema.ts` file.

## Installing Dependencies

### Installing npm Packages

1. Install all dependencies:
   ```bash
   npm install
   ```

2. Verify installation:
   ```bash
   npm list --depth=0
   ```

### Verifying Environment

After installing dependencies, verify your environment:

```bash
npm run verify-env
```

This script checks that all required environment variables are set and that the database connection is working.

## Running the Application

### Development Mode

To run the application in development mode with hot reloading:

```bash
npm run dev
```

This command starts both the frontend and backend in development mode. The application will be available at `http://localhost:5000`.

### Building for Production

To build the application for production:

```bash
npm run build
```

This command builds both the frontend and backend for production deployment.

### Running in Production Mode

To run the built application in production mode:

```bash
npm start
```

### Using PM2 (Optional)

For a more production-like environment, you can use PM2:

```bash
npm run start:pm2:windows  # For Windows
```

## Development Workflow

### Code Structure

When developing for SkyPANEL, follow these guidelines:

1. **Frontend Components**:
   - Place reusable components in `/client/src/components`
   - Place page components in `/client/src/pages`
   - Use TypeScript for type safety
   - Follow the existing component structure

2. **Backend Services**:
   - Place new services in `/server/services`
   - Keep services focused on a single responsibility
   - Use TypeScript for type safety
   - Follow the existing service structure

3. **API Routes**:
   - Add new routes to `/server/routes_new.ts`
   - Group routes by domain (users, servers, billing, etc.)
   - Use proper middleware for authentication and validation

4. **Database Schema**:
   - Define new tables in `/shared/schema.ts`
   - Use Drizzle ORM conventions
   - Run `npm run db:push` after schema changes

### Development Best Practices

1. **Code Style**:
   - Follow the existing code style
   - Use ESLint and Prettier for code formatting
   - Run `npm run check` to verify TypeScript types

2. **Git Workflow**:
   - Create feature branches for new features
   - Create bugfix branches for bug fixes
   - Use descriptive commit messages
   - Keep commits focused on a single change

3. **Testing**:
   - Write tests for new features
   - Run tests with `npm test`
   - Ensure all tests pass before submitting changes

## Troubleshooting

### Common Issues

1. **Database Connection Issues**:
   - Verify PostgreSQL is running
   - Check `DATABASE_URL` in `.env`
   - Ensure database user has proper permissions
   - Try connecting with `psql` to verify credentials

2. **Node.js Version Issues**:
   - Verify Node.js version with `node --version`
   - Use nvm to install the correct version if needed
   - Update npm with `npm install -g npm`

3. **Dependency Issues**:
   - Clear npm cache with `npm cache clean --force`
   - Delete `node_modules` and reinstall with `npm install`
   - Check for conflicting dependencies

4. **Port Already in Use**:
   - Change the `PORT` in `.env`
   - Check for other processes using port 5000
   - Kill the process using the port

### Getting Help

If you encounter issues not covered in this guide:

1. Check the existing documentation in the `/docs` directory
2. Search for similar issues in the project's issue tracker
3. Reach out to the development team for assistance

---

## Additional Resources

- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [React Documentation](https://reactjs.org/docs/getting-started.html)
- [Express.js Documentation](https://expressjs.com/)
- [Drizzle ORM Documentation](https://orm.drizzle.team/docs/overview)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

---

This setup guide should help you get started with SkyPANEL development. If you have any questions or need further assistance, please contact the development team.