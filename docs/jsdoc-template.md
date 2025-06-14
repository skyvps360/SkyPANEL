# JSDoc Documentation Template for SkyPANEL

This document provides templates and guidelines for documenting code in the SkyPANEL application using JSDoc. Consistent documentation helps developers understand the codebase, improves maintainability, and enables automatic documentation generation.

## Table of Contents

1. [General Guidelines](#general-guidelines)
2. [Module Documentation](#module-documentation)
3. [Function Documentation](#function-documentation)
4. [Class Documentation](#class-documentation)
5. [Interface Documentation](#interface-documentation)
6. [API Endpoint Documentation](#api-endpoint-documentation)
7. [React Component Documentation](#react-component-documentation)
8. [Hook Documentation](#hook-documentation)
9. [Type Definition Documentation](#type-definition-documentation)
10. [Example File](#example-file)

## General Guidelines

1. **Be Clear and Concise**: Write documentation that is easy to understand but comprehensive.
2. **Keep Documentation Close to Code**: Document code as close as possible to the implementation.
3. **Update Documentation with Code**: When code changes, update the documentation.
4. **Use Consistent Style**: Follow the same documentation style throughout the codebase.
5. **Document Why, Not Just What**: Explain the reasoning behind complex implementations.
6. **Include Examples**: Provide usage examples for complex functions and components.
7. **Document Edge Cases**: Clearly document edge cases and error conditions.

## Module Documentation

Use this template at the top of each file to document the module:

```typescript
/**
 * Module Name
 * 
 * Brief description of what this module does and its purpose in the application.
 * Include any important details about how it fits into the overall architecture.
 * 
 * @module module-name
 */
```

Example:

```typescript
/**
 * Authentication Module
 * 
 * This module handles user authentication, registration, login, and email verification
 * for the SkyPANEL application. It uses Passport.js for authentication strategies and
 * includes functions for password hashing and comparison.
 * 
 * @module auth
 */
```

## Function Documentation

Use this template for documenting functions:

```typescript
/**
 * Brief description of what the function does
 * 
 * More detailed explanation if necessary. Include information about
 * the algorithm, edge cases, or any other important details.
 * 
 * @param {type} paramName - Description of the parameter
 * @param {type} [optionalParam] - Description of the optional parameter
 * @returns {returnType} Description of the return value
 * @throws {ErrorType} Description of when this error is thrown
 * 
 * @example
 * // Example usage of the function
 * const result = functionName(param1, param2);
 */
function functionName(paramName, optionalParam) {
  // Implementation
}
```

Example:

```typescript
/**
 * Hashes a password using scrypt with a random salt
 * 
 * @param {string} password - The plain text password to hash
 * @returns {Promise<string>} The hashed password in format "hash.salt"
 */
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}
```

## Class Documentation

Use this template for documenting classes:

```typescript
/**
 * Brief description of the class
 * 
 * More detailed explanation if necessary. Include information about
 * the class's purpose, usage patterns, and any important details.
 * 
 * @class
 * @implements {InterfaceName}
 * @extends {ParentClassName}
 */
class ClassName extends ParentClassName implements InterfaceName {
  /**
   * Brief description of the property
   *
   * @type {PropertyType}
   */
  propertyName: PropertyType;

  /**
   * Creates an instance of ClassName.
   *
   * @param {ConstructorParamType} paramName - Description of the parameter
   */
  constructor(paramName: ConstructorParamType) {
    super();
    // Implementation
  }

  /**
   * Brief description of the method
   *
   * @param {MethodParamType} paramName - Description of the parameter
   * @returns {ReturnType} Description of the return value
   */
  methodName(paramName: MethodParamType): ReturnType {
    // Implementation
  }
}
```

Example:

```typescript
/**
 * Email verification service for managing user email verification
 * 
 * This class handles creating, sending, and verifying email verification tokens.
 * It also manages the creation of VirtFusion accounts after email verification.
 * 
 * @class
 */
export class EmailVerificationService {
  /**
   * Sends a verification email to a user
   *
   * @param {number} userId - The ID of the user to send verification to
   * @param {string} email - The email address to send verification to
   * @returns {Promise<VerificationResult>} Result of the send operation
   */
  static async sendVerificationEmail(userId: number, email: string): Promise<VerificationResult> {
    // Implementation
  }
}
```

## Interface Documentation

Use this template for documenting interfaces:

```typescript
/**
 * Brief description of the interface
 *
 * More detailed explanation if necessary. Include information about
 * how the interface is used and its purpose.
 *
 * @interface
 * @extends {ParentInterface}
 */
interface InterfaceName extends ParentInterface {
  /**
   * Brief description of the property
   *
   * @type {PropertyType}
   */
  propertyName: PropertyType;

  /**
   * Brief description of the method
   *
   * @param {MethodParamType} paramName - Description of the parameter
   * @returns {ReturnType} Description of the return value
   */
  methodName(paramName: MethodParamType): ReturnType;
}
```

Example:

```typescript
/**
 * Configuration options for the email service
 *
 * @interface
 */
interface EmailServiceConfig {
  /**
   * SMTP server hostname
   *
   * @type {string}
   */
  host: string;

  /**
   * SMTP server port
   *
   * @type {number}
   */
  port: number;

  /**
   * Whether to use secure connection (TLS)
   *
   * @type {boolean}
   */
  secure: boolean;

  /**
   * Authentication credentials
   *
   * @type {EmailAuthOptions}
   */
  auth: EmailAuthOptions;
}
```

## API Endpoint Documentation

Use this template for documenting API endpoints:

```typescript
/**
 * @api {method} /path/:param Endpoint Name
 * @apiDescription Brief description of what the endpoint does
 *
 * @apiParam {ParamType} paramName Description of the URL parameter
 * @apiParam {QueryType} [queryName] Description of the optional query parameter
 *
 * @apiBody {BodyType} bodyName Description of the request body
 *
 * @apiSuccess {SuccessType} fieldName Description of the response field
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "field": "value"
 *     }
 *
 * @apiError {ErrorType} ErrorName Description of the error
 * @apiErrorExample {json} Error-Response:
 *     HTTP/1.1 404 Not Found
 *     {
 *       "error": "ErrorMessage"
 *     }
 */
```

Example:

```typescript
/**
 * @api {post} /api/login User login
 * @apiDescription Authenticates a user and creates a session
 * 
 * @apiBody {string} username User's username
 * @apiBody {string} password User's password
 * 
 * @apiSuccess {Object} user User object with session information
 * 
 * @apiError {Object} error Error object with message
 * @apiError {boolean} [needsVerification] Whether the user needs to verify their email
 * @apiError {number} [userId] User ID if verification is needed
 * @apiError {string} [email] User email if verification is needed
 */
app.post("/api/login", (req, res, next) => {
  // Implementation
});
```

## React Component Documentation

Use this template for documenting React components:

```typescript
/**
 * Brief description of the component
 *
 * More detailed explanation if necessary. Include information about
 * the component's purpose, usage patterns, and any important details.
 *
 * @component
 * @example
 * // Example usage of the component
 * <ComponentName prop1="value" prop2={42} />
 */
interface ComponentNameProps {
  /**
   * Description of the prop
   */
  prop1: string;
  
  /**
   * Description of the prop
   * @default defaultValue
   */
  prop2?: number;
}

/**
 * ComponentName component
 */
const ComponentName: React.FC<ComponentNameProps> = ({ prop1, prop2 = defaultValue }) => {
  // Implementation
  return (
    <div>
      {/* JSX */}
    </div>
  );
};
```

Example:

```typescript
/**
 * Server status indicator component
 *
 * Displays the current status of a server with appropriate color coding.
 * Status can be: running (green), stopped (red), or pending (yellow).
 *
 * @component
 * @example
 * // Example usage
 * <ServerStatusIndicator status="running" showLabel={true} />
 */
interface ServerStatusIndicatorProps {
  /**
   * Current status of the server
   */
  status: 'running' | 'stopped' | 'pending';
  
  /**
   * Whether to show a text label next to the indicator
   * @default false
   */
  showLabel?: boolean;
}

/**
 * ServerStatusIndicator component
 */
const ServerStatusIndicator: React.FC<ServerStatusIndicatorProps> = ({ 
  status, 
  showLabel = false 
}) => {
  // Implementation
};
```

## Hook Documentation

Use this template for documenting custom hooks:

```typescript
/**
 * Brief description of the hook
 *
 * More detailed explanation if necessary. Include information about
 * the hook's purpose, usage patterns, and any important details.
 *
 * @hook
 * @param {ParamType} paramName - Description of the parameter
 * @returns {ReturnType} Description of the return value
 *
 * @example
 * // Example usage of the hook
 * const result = useHookName(param);
 */
function useHookName(paramName: ParamType): ReturnType {
  // Implementation
  return result;
}
```

Example:

```typescript
/**
 * Hook for managing server power state
 *
 * Provides functions to start, stop, and restart a server,
 * along with the current status of the operation.
 *
 * @hook
 * @param {number} serverId - ID of the server to manage
 * @returns {ServerPowerControls} Object containing control functions and status
 *
 * @example
 * // Example usage
 * const { start, stop, restart, isLoading, error } = useServerPower(123);
 */
function useServerPower(serverId: number): ServerPowerControls {
  // Implementation
  return {
    start,
    stop,
    restart,
    isLoading,
    error
  };
}
```

## Type Definition Documentation

Use this template for documenting type definitions:

```typescript
/**
 * Brief description of the type
 *
 * More detailed explanation if necessary.
 *
 * @typedef {Object} TypeName
 * @property {PropertyType} propertyName - Description of the property
 * @property {PropertyType} [optionalProperty] - Description of the optional property
 */
type TypeName = {
  propertyName: PropertyType;
  optionalProperty?: PropertyType;
};
```

Example:

```typescript
/**
 * Server configuration options
 *
 * @typedef {Object} ServerConfig
 * @property {number} cpuCores - Number of CPU cores
 * @property {number} memoryMB - Memory in megabytes
 * @property {number} diskGB - Disk space in gigabytes
 * @property {string} [osType] - Operating system type
 */
type ServerConfig = {
  cpuCores: number;
  memoryMB: number;
  diskGB: number;
  osType?: string;
};
```

## Example File

Here's an example of a well-documented file:

```typescript
/**
 * Authentication Module
 * 
 * This module handles user authentication, registration, login, and email verification
 * for the SkyPANEL application. It uses Passport.js for authentication strategies and
 * includes functions for password hashing and comparison.
 * 
 * @module auth
 */

import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

/**
 * Extends Express User interface to include our custom user properties
 */
declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

/**
 * Promisified version of the scrypt function for password hashing
 */
const scryptAsync = promisify(scrypt);

/**
 * Hashes a password using scrypt with a random salt
 * 
 * @param {string} password - The plain text password to hash
 * @returns {Promise<string>} The hashed password in format "hash.salt"
 */
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

/**
 * Compares a supplied password with a stored hashed password
 * 
 * @param {string} supplied - The plain text password to check
 * @param {string} stored - The stored hashed password in format "hash.salt"
 * @returns {Promise<boolean>} True if passwords match, false otherwise
 */
export async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

/**
 * Sets up authentication for the Express application
 * 
 * This function configures Passport.js with the local strategy for authentication,
 * sets up session management, and registers authentication-related routes.
 * 
 * @param {Express} app - The Express application instance
 */
export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        // Implementation
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    // Implementation
  });

  /**
   * @api {post} /api/register Register a new user
   * @apiDescription Creates a new user account and sends verification email
   * 
   * @apiBody {string} username Username for the new account
   * @apiBody {string} email Email address for the new account
   * @apiBody {string} password Password for the new account (min 8 characters)
   * 
   * @apiSuccess {Object} user User object with verification status
   * @apiSuccess {boolean} emailVerificationSent Whether verification email was sent
   * @apiSuccess {string} message Success message
   * 
   * @apiError {Object} error Error object with message
   */
  app.post("/api/register", async (req, res, next) => {
    // Implementation
  });

  /**
   * @api {post} /api/login User login
   * @apiDescription Authenticates a user and creates a session
   * 
   * @apiBody {string} username User's username
   * @apiBody {string} password User's password
   * 
   * @apiSuccess {Object} user User object with session information
   * 
   * @apiError {Object} error Error object with message
   */
  app.post("/api/login", (req, res, next) => {
    // Implementation
  });

  // Additional routes and implementations
}
```

## Conclusion

Following these documentation templates and guidelines will help ensure consistency across the SkyPANEL codebase and make it easier for developers to understand and maintain the code. Remember to update documentation when code changes and to document not just what the code does, but why it does it that way.