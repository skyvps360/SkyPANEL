# Gemini Project Configuration: SkyPANEL

This document outlines the project structure, technologies, and conventions for the SkyPANEL application. It serves as a guide for Gemini to better understand the codebase and assist with development tasks.

## Project Overview

SkyPANEL is a full-stack web application built with a modern technology stack. It features a React-based frontend and a Node.js/Express backend, with a strong emphasis on TypeScript for type safety. The application integrates with various services, including Discord, PayPal, and Google AI, to provide a comprehensive user experience.

### Core Technologies

- **Frontend:**
  - **Framework:** React
  - **Language:** TypeScript
  - **Styling:** Tailwind CSS with `lucide-react` for icons
  - **UI Components:** Radix UI and `shadcn/ui`
  - **Build Tool:** Vite

- **Backend:**
  - **Framework:** Express.js
  - **Language:** TypeScript
  - **Database:** PostgreSQL with Drizzle ORM
  - **Authentication:** Passport.js with local strategy and sessions
  - **API:** RESTful API with routes defined in `server/routes_new.ts`

- **Shared:**
  - **Schema:** Zod for data validation and schema definition
  - **Types:** Shared TypeScript types and schemas in the `shared` directory

### Key Libraries and Services

- **`@google/generative-ai`:** Integration with Google's generative AI models.
- **`@paypal/paypal-server-sdk`:** PayPal integration for payment processing.
- **`discord.js`:** Interaction with the Discord API for bot functionality.
- **`drizzle-orm`:** Modern TypeScript ORM for PostgreSQL.
- **`nodemailer`:** Email sending service.
- **`wouter`:** A minimalist routing library for React.
- **`vitest`:** A fast and modern testing framework.

## Project Structure

The project is organized into three main directories: `client`, `server`, and `shared`.

- **`client/`:** Contains the React frontend application.
  - **`src/`:** The main source code for the client application.
    - **`components/`:** Reusable React components.
    - **`pages/`:** Top-level page components.
    - **`hooks/`:** Custom React hooks.
    - **`lib/`:** Utility functions and libraries.
- **`server/`:** Contains the Node.js/Express backend application.
  - **`routes/`:** API route definitions.
  - **`services/`:** Business logic and service integrations.
  - **`middleware/`:** Express middleware functions.
  - **`db.ts`:** Database connection and configuration.
- **`shared/`:** Contains code shared between the client and server.
  - **`schema.ts`:** Drizzle ORM schema definitions.
  - **`schemas/`:** Zod schemas for data validation.

## Development Workflow

### Scripts

The `package.json` file defines the following scripts for common development tasks:

- **`dev`:** Starts the development server with hot-reloading.
- **`build`:** Builds the application for production.
- **`start`:** Starts the production server.
- **`test`:** Runs the test suite using Vitest.
- **`check`:** Type-checks the codebase with TypeScript.
- **`db:push`:** Pushes database schema changes using Drizzle Kit.

### Conventions

- **Code Style:** The project follows standard TypeScript and React conventions. Use functional components with hooks, and maintain a consistent coding style.
- **File Naming:** Use kebab-case for file names (e.g., `user-profile.tsx`).
- **Commits:** Follow conventional commit standards for clear and concise commit messages.
- **State Management:** Utilize React's built-in state management (useState, useContext) or a lightweight library like Zustand if needed.
- **API Routes:** All API routes are prefixed with `/api`.

## How to Get Help

When you need assistance, please provide clear and specific requests. For example:

- "Create a new React component for displaying user profiles."
- "Add a new API endpoint to fetch user data."
- "Refactor the `auth-service.ts` to use a different authentication strategy."

By following these guidelines, Gemini can provide more accurate and effective assistance with your SkyPANEL project.
