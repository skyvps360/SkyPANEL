# VirtFusion Integration Guide

This document provides comprehensive documentation for the VirtFusion integration in SkyPANEL, including setup, configuration, and usage.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Setup and Configuration](#setup-and-configuration)
- [API Integration](#api-integration)
- [Server Management](#server-management)
- [User Management](#user-management)
- [Billing Integration](#billing-integration)
- [Error Handling](#error-handling)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

## Overview

SkyPANEL integrates with VirtFusion to provide comprehensive VPS hosting management capabilities. This integration allows users to manage their virtual servers, monitor resources, and handle billing through a unified interface.

## Prerequisites

- VirtFusion API access
- Valid API credentials
- Sufficient permissions for the required operations
- Network access to the VirtFusion API endpoint

## Setup and Configuration

### Environment Variables

Add the following environment variables to your `.env` file:

```env
# VirtFusion Configuration
VIRT_FUSION_API_URL=https://api.virtfusion.example.com
VIRT_FUSION_API_KEY=your_api_key_here
VIRT_FUSION_API_SECRET=your_api_secret_here
VIRT_FUSION_WEBHOOK_SECRET=your_webhook_secret
```

### Initialization

The VirtFusion service is initialized in `virtfusion-service.ts`:

```typescript
import { VirtFusionAPI } from './virtfusion-api';

export class VirtFusionService {
  private api: VirtFusionAPI;

  constructor() {
    this.api = new VirtFusionAPI({
      baseURL: process.env.VIRT_FUSION_API_URL!,
      apiKey: process.env.VIRT_FUSION_API_KEY!,
      apiSecret: process.env.VIRT_FUSION_API_SECRET!,
    });
  }
  
  // Service methods...
}

export const virtFusionService = new VirtFusionService();
```

## API Integration

### Authentication

SkyPANEL uses API key authentication to communicate with the VirtFusion API. The authentication is handled automatically by the `VirtFusionAPI` class.

### Rate Limiting

The integration includes built-in rate limiting to prevent hitting VirtFusion API limits:

- 60 requests per minute per IP address
- Exponential backoff for rate-limited requests
- Request queuing for high-volume operations

## Server Management

### Key Features

- Server provisioning
- Server status monitoring
- Resource usage tracking
- Server actions (start, stop, restart, etc.)
- Console access

### Example: List Servers

```typescript
async listServers(params?: ServerListParams): Promise<Server[]> {
  try {
    const response = await this.api.get<Server[]>('/servers', { params });
    return response.data;
  } catch (error) {
    this.handleError(error, 'Failed to list servers');
    throw error;
  }
}
```

### Example: Create Server

```typescript
async createServer(serverData: ServerCreateData): Promise<Server> {
  try {
    const response = await this.api.post<Server>('/servers', serverData);
    return response.data;
  } catch (error) {
    this.handleError(error, 'Failed to create server');
    throw error;
  }
}
```

## User Management

### Key Features

- User account synchronization
- Permission management
- API key generation
- Two-factor authentication

### Example: Sync User

```typescript
async syncUser(userData: UserSyncData): Promise<User> {
  try {
    const response = await this.api.post<User>('/users/sync', userData);
    return response.data;
  } catch (error) {
    this.handleError(error, 'Failed to sync user');
    throw error;
  }
}
```

## Billing Integration

### Key Features

- Subscription management
- Invoice generation
- Payment processing
- Usage tracking

### Example: Create Subscription

```typescript
async createSubscription(subscriptionData: SubscriptionData): Promise<Subscription> {
  try {
    const response = await this.api.post<Subscription>('/billing/subscriptions', subscriptionData);
    return response.data;
  } catch (error) {
    this.handleError(error, 'Failed to create subscription');
    throw error;
  }
}
```

## Webhooks

SkyPANEL can receive webhook events from VirtFusion for real-time updates.

### Supported Events

- `server.created`
- `server.updated`
- `server.deleted`
- `user.created`
- `user.updated`
- `invoice.created`
- `invoice.paid`

### Webhook Handler

```typescript
async handleWebhook(event: string, data: any, signature: string): Promise<void> {
  // Verify the webhook signature
  if (!this.verifySignature(signature, data)) {
    throw new Error('Invalid webhook signature');
  }

  // Process the webhook event
  switch (event) {
    case 'server.created':
      await this.handleServerCreated(data);
      break;
    case 'server.updated':
      await this.handleServerUpdated(data);
      break;
    // Handle other events...
    default:
      console.log(`Unhandled webhook event: ${event}`);
  }
}
```

## Error Handling

The integration implements robust error handling to ensure reliability and provide meaningful feedback. All errors follow a consistent structure and include appropriate HTTP status codes.

### Error Types

1. **Network Errors**
   - Connection timeouts
   - DNS resolution failures
   - SSL/TLS handshake failures
   - Network unreachable

2. **API Errors**
   - 400 Bad Request: Invalid request format or parameters
   - 401 Unauthorized: Authentication failed
   - 403 Forbidden: Insufficient permissions
   - 404 Not Found: Resource doesn't exist
   - 422 Unprocessable Entity: Validation failed
   - 429 Too Many Requests: Rate limit exceeded
   - 5xx Server Errors: Internal server errors

3. **Business Logic Errors**
   - Insufficient resources
   - Invalid state transitions
   - Business rule violations

### Error Response Format

All error responses follow this consistent JSON structure:

```typescript
{
  success: false,
  error: {
    // Required fields
    code: string;           // Machine-readable error code (e.g., 'RATE_LIMITED', 'INVALID_INPUT')
    message: string;        // Human-readable error message
    
    // Optional fields
    statusCode?: number;     // HTTP status code
    details?: {              // Additional error context
      field?: string;        // Field that failed validation
      value?: any;           // Invalid value
      constraints?: string[]; // Validation constraints
      [key: string]: any;    // Additional error-specific data
    };
    retryable?: boolean;    // Whether the operation can be retried
    timestamp?: string;      // ISO 8601 timestamp of when error occurred
    requestId?: string;      // Unique identifier for the request
    documentationUrl?: string; // Link to relevant documentation
  }
}
```

### Error Handling Implementation

```typescript
class VFError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: any,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'VFError';
    Error.captureStackTrace(this, VFError);
  }
  
  toJSON() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        statusCode: this.statusCode,
        details: this.details,
        retryable: this.retryable,
        timestamp: new Date().toISOString(),
        ...(process.env.NODE_ENV === 'development' && { stack: this.stack })
      }
    };
  }
}

// Example usage:
throw new VFError(
  'INSUFFICIENT_CREDITS',
  'Not enough credits to create server',
  402,
  { required: 100, available: 50 },
  false
);
```

### Retry Logic

For transient failures, the integration includes an automatic retry mechanism:

```typescript
async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
    onRetry?: (error: Error, attempt: number, delay: number) => void;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    onRetry
  } = options;
  
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry non-retryable errors or validation errors
      if (error.statusCode && error.statusCode < 500 && error.statusCode !== 429) {
        break;
      }
      
      if (attempt < maxRetries) {
        // Exponential backoff with jitter
        const delay = Math.min(
          baseDelay * Math.pow(2, attempt - 1) * (0.8 + Math.random() * 0.4),
          maxDelay
        );
        
        if (onRetry) {
          onRetry(error, attempt, delay);
        }
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}
```

### Error Logging

All errors are logged with structured context for better debugging:

```typescript
interface ErrorLogEntry {
  timestamp: string;
  level: 'error' | 'warn' | 'info';
  code: string;
  message: string;
  stack?: string;
  context?: {
    userId?: string;
    requestId?: string;
    [key: string]: any;
  };
  error: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
    details?: any;
  };
}

function logError(error: Error, context: Record<string, any> = {}) {
  const entry: ErrorLogEntry = {
    timestamp: new Date().toISOString(),
    level: 'error',
    code: error['code'] || 'UNKNOWN_ERROR',
    message: error.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : error.stack,
    context,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...(error['code'] && { code: error['code'] }),
      ...(error['details'] && { details: error['details'] })
    }
  };
  
  // Log to appropriate destination (console, file, logging service, etc.)
  console.error(JSON.stringify(entry));
}
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Authentication Failures

**Symptoms**:
- 401 Unauthorized errors
- "Invalid signature" or "Expired token" messages
- Inability to authenticate with the API

**Diagnosis**:
1. Check API credentials in your environment:
   ```bash
   # Verify environment variables are set
   echo "VIRT_FUSION_API_KEY: ${VIRT_FUSION_API_KEY:0:4}..."
   echo "VIRT_FUSION_API_SECRET: ${VIRT_FUSION_API_SECRET:0:4}..."
   ```

2. Verify system time synchronization:
   ```bash
   # Linux/macOS
   date
   sudo ntpdate -q pool.ntp.org
   
   # Windows
   w32tm /query /status
   w32tm /resync
   ```

**Solutions**:
1. Regenerate API keys in VirtFusion dashboard
2. Verify the API key has the correct permissions:
   - Server management
   - User management
   - Billing access (if needed)
3. Check for time drift (should be within 5 minutes of actual time)
4. Verify the API endpoint URL is correct

#### 2. Rate Limiting Issues

**Symptoms**:
- 429 Too Many Requests errors
- Inconsistent API responses
- Performance degradation during high traffic

**Diagnosis**:
1. Check current rate limits:
   ```typescript
   // Example: Check rate limit headers
   const checkRateLimits = async () => {
     const response = await fetch(`${process.env.VIRT_FUSION_API_URL}/servers`, {
       headers: { 'Authorization': `Bearer ${process.env.VIRT_FUSION_API_KEY}` }
     });
     
     return {
       limit: response.headers.get('X-RateLimit-Limit'),
       remaining: response.headers.get('X-RateLimit-Remaining'),
       reset: new Date(Number(response.headers.get('X-RateLimit-Reset')) * 1000)
     };
   };
   ```

**Solutions**:
1. Implement request queuing with rate limiting:
   ```typescript
   import { RateLimiter } from 'limiter';
   
   const limiter = new RateLimiter({
     tokensPerInterval: 50, // Adjust based on your quota
     interval: 'minute',
     fireImmediately: false
   });
   
   async function makeRateLimitedRequest(requestFn: () => Promise<any>) {
     await limiter.removeTokens(1);
     return requestFn();
   }
   ```

2. Add jitter to retry delays
3. Implement request deduplication
4. Cache frequent responses
5. Request higher rate limits if needed

#### 3. Webhook Delivery Failures

**Symptoms**:
- Missing webhook events
- 4xx/5xx errors in delivery logs
- Inconsistent event delivery

**Diagnosis**:
1. Test webhook endpoint:
   ```bash
   # Test webhook delivery
   curl -X POST -H "Content-Type: application/json" \
     -H "X-VF-Signature: your-signature" \
     -d '{"event": "test", "data": {"test": true}}' \
     https://your-webhook-endpoint.com/api/webhooks/virtfusion
   ```

2. Check webhook configuration:
   - Verify URL is HTTPS
   - Check authentication headers
   - Validate payload signature

**Solutions**:
1. Implement webhook retry logic:
   ```typescript
   async function handleWebhookWithRetry(
     event: WebhookEvent,
     attempt = 1,
     maxAttempts = 3
   ): Promise<void> {
     try {
       await handleWebhook(event);
     } catch (error) {
       if (attempt >= maxAttempts) throw error;
       
       const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
       await new Promise(resolve => setTimeout(resolve, delay));
       
       return handleWebhookWithRetry(event, attempt + 1, maxAttempts);
     }
   }
   ```

2. Set up dead-letter queue for failed webhooks
3. Monitor webhook delivery metrics
4. Implement webhook signature verification:
   ```typescript
   function verifyWebhookSignature(
     payload: string | Buffer,
     signature: string,
     secret: string
   ): boolean {
     const hmac = crypto.createHmac('sha256', secret);
     const digest = hmac.update(payload).digest('hex');
     return crypto.timingSafeEqual(
       Buffer.from(signature, 'hex'),
       Buffer.from(digest, 'hex')
     );
   }
   ```

#### 4. Server Provisioning Failures

**Symptoms**:
- Servers stuck in "provisioning" state
- Incomplete server creation
- Resource allocation errors

**Diagnosis**:
1. Check server logs in VirtFusion dashboard
2. Verify resource availability:
   - CPU cores
   - Memory
   - Storage space
   - IP addresses

**Solutions**:
1. Implement provisioning state machine:
   ```typescript
   async function monitorServerProvisioning(serverId: string, timeoutMinutes = 30) {
     const startTime = Date.now();
     const timeoutMs = timeoutMinutes * 60 * 1000;
     
     while (Date.now() - startTime < timeoutMs) {
       const server = await getServerStatus(serverId);
       
       if (server.status === 'active') {
         return { success: true, server };
       } else if (server.status === 'error') {
         return { 
           success: false, 
           error: server.error || 'Provisioning failed'
         };
       }
       
       // Check every 10 seconds
       await new Promise(resolve => setTimeout(resolve, 10000));
     }
     
     throw new Error('Server provisioning timed out');
   }
   ```

2. Implement cleanup for failed provisioning
3. Add resource validation before provisioning
4. Monitor resource quotas

#### 5. Performance Issues

**Symptoms**:
- Slow API responses
- Timeout errors
- High resource usage

**Diagnosis**:
1. Monitor API response times
2. Check server resource usage
3. Analyze database queries

**Solutions**:
1. Implement caching:
   ```typescript
   import NodeCache from 'node-cache';
   
   const cache = new NodeCache({ 
     stdTTL: 300, // 5 minutes
     checkperiod: 60, // Check for expired items every minute
     useClones: false // Better performance for large objects
   });
   
   async function getWithCache<T>(
     key: string, 
     fetchFn: () => Promise<T>,
     ttl?: number
   ): Promise<T> {
     const cached = cache.get<T>(key);
     if (cached) return cached;
     
     const data = await fetchFn();
     cache.set(key, data, ttl);
     return data;
   }
   ```

2. Optimize database queries
3. Use pagination for large datasets
4. Implement request batching
5. Monitor and optimize memory usage

#### 6. Debugging Tips

1. Enable debug logging:
   ```typescript
   import debug from 'debug';
   
   const log = debug('skypanel:virtfusion');
   const error = debug('skypanel:virtfusion:error');
   
   // Usage
   log('Making API request to %s', endpoint);
   error('Request failed: %O', error);
   ```
   
   Run with debug logging:
   ```bash
   DEBUG=skypanel:virtfusion* npm run dev
   ```

2. Use request/response interception:
   ```typescript
   // Using Axios interceptors
   api.interceptors.request.use(request => {
     console.log('Request:', request.method?.toUpperCase(), request.url);
     return request;
   });
   
   api.interceptors.response.use(
     response => {
       console.log('Response:', response.status, response.config.url);
       return response;
     },
     error => {
       console.error('API Error:', {
         url: error.config?.url,
         status: error.response?.status,
         data: error.response?.data,
       });
       return Promise.reject(error);
     }
   );
   ```

3. Check system resources:
   ```bash
   # CPU and memory usage
   top
   
   # Disk space
   df -h
   
   # Network connections
   netstat -tuln
   ```

## Best Practices

### 1. Caching Strategy

#### When to Cache
- **Short-lived data (1-5 minutes)**:
  - Server status
  - Resource usage metrics
  - User permissions
- **Longer-lived data (1-24 hours)**:
  - Server types and configurations
  - Location information
  - Pricing data

#### Implementation

```typescript
import NodeCache from 'node-cache';

// Configure cache with appropriate TTLs
const cache = new NodeCache({
  stdTTL: 300, // 5 minutes default TTL
  checkperiod: 60, // Check for expired items every minute
  useClones: false, // Better performance for large objects
  maxKeys: 1000 // Prevent memory leaks
});

// Cache decorator for service methods
function cached(ttl: number) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const cacheKey = `${propertyKey}:${JSON.stringify(args)}`;
      const cached = cache.get(cacheKey);
      
      if (cached) {
        return cached;
      }
      
      const result = await originalMethod.apply(this, args);
      cache.set(cacheKey, result, ttl);
      return result;
    };
    
    return descriptor;
  };
}

// Usage in service class
class VirtFusionService {
  @cached(300) // Cache for 5 minutes
  async getServerTypes() {
    // API call to get server types
  }
}
```

### 2. Error Handling

#### Structured Error Types

```typescript
class VFError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: any,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'VFError';
    Error.captureStackTrace(this, VFError);
  }
  
  toJSON() {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
      retryable: this.retryable,
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' && { stack: this.stack })
    };
  }
}
```

#### Retry Logic with Backoff

```typescript
async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
    onRetry?: (error: Error, attempt: number, delay: number) => void;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    onRetry
  } = options;
  
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry non-retryable errors
      if (!error.retryable) break;
      
      if (attempt < maxRetries) {
        const delay = Math.min(
          baseDelay * Math.pow(2, attempt - 1) * (0.8 + Math.random() * 0.4),
          maxDelay
        );
        
        if (onRetry) {
          onRetry(error, attempt, delay);
        }
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}
```

### 3. Security

#### Secure API Key Management

```typescript
// Load API keys from environment variables with validation
function getRequiredEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const config = {
  apiKey: getRequiredEnvVar('VIRT_FUSION_API_KEY'),
  apiSecret: getRequiredEnvVar('VIRT_FUSION_API_SECRET'),
  // ... other config
};
```

#### Input Validation with Zod

```typescript
import { z } from 'zod';

const ServerSchema = z.object({
  name: z.string().min(3).max(64),
  cpu: z.number().int().min(1).max(32),
  memory: z.number().int().min(1024).max(131072),
  disk: z.number().int().min(20).max(2048),
  template: z.string().uuid(),
  network: z.object({
    ipv4: z.string().ip({ version: 'v4' }),
    ipv6: z.string().ip({ version: 'v6' }).optional(),
  }),
});

// Usage
function validateServerConfig(input: unknown) {
  try {
    return ServerSchema.parse(input);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new VFError(
        'INVALID_INPUT',
        'Invalid server configuration',
        400,
        { errors: error.errors }
      );
    }
    throw error;
  }
}
```

### 4. Performance Optimization

#### Request Batching

```typescript
class BatchProcessor<T, R> {
  private queue: Array<{
    item: T;
    resolve: (value: R) => void;
    reject: (error: Error) => void;
  }> = [];
  private processing = false;
  
  constructor(
    private batchSize: number,
    private processBatch: (items: T[]) => Promise<R[]>,
    private batchDelay = 50 // ms
  ) {}
  
  add(item: T): Promise<R> {
    return new Promise((resolve, reject) => {
      this.queue.push({ item, resolve, reject });
      if (!this.processing) {
        this.processQueue();
      }
    });
  }
  
  private async processQueue() {
    if (this.queue.length === 0) {
      this.processing = false;
      return;
    }
    
    this.processing = true;
    
    // Wait for batch to fill or delay to pass
    await new Promise(resolve => setTimeout(resolve, this.batchDelay));
    
    const batch = this.queue.splice(0, this.batchSize);
    
    try {
      const results = await this.processBatch(batch.map(b => b.item));
      
      // Resolve all promises with their results
      batch.forEach(({ resolve }, index) => {
        resolve(results[index]);
      });
    } catch (error) {
      // Reject all promises in batch
      batch.forEach(({ reject }) => {
        reject(error);
      });
    } finally {
      // Process next batch if items are queued
      setImmediate(() => this.processQueue());
    }
  }
}

// Usage
const serverBatchProcessor = new BatchProcessor<ServerConfig, Server>(
  10, // Batch size
  async (configs) => {
    // Batch process server configurations
    return Promise.all(configs.map(createServer));
  },
  100 // Max 100ms batching window
);
```

### 5. Monitoring and Observability

#### Structured Logging

```typescript
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  timestamp: () => `,"time":"${new Date().toISOString()}"`,
  formatters: {
    level: (label) => ({ level: label })
  },
  base: {
    service: 'skypanel-virtfusion',
    env: process.env.NODE_ENV
  }
});

// Usage
logger.info(
  { serverId: '123', action: 'provision' },
  'Provisioning server'
);

logger.error(
  { 
    error: error.message,
    stack: error.stack,
    code: error.code,
    attempt
  },
  'Failed to provision server'
);
```

#### Metrics Collection

```typescript
import { collectDefaultMetrics, Gauge, Counter, Histogram } from 'prom-client';

// Collect default metrics (CPU, memory, etc.)
collectDefaultMetrics();

// Custom metrics
const requestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

const activeRequests = new Gauge({
  name: 'active_requests',
  help: 'Number of active requests',
  labelNames: ['endpoint']
});

// Usage in middleware
app.use((req, res, next) => {
  const end = requestDuration.startTimer();
  const route = req.route?.path || req.path;
  
  activeRequests.inc({ endpoint: route });
  
  res.on('finish', () => {
    end({ method: req.method, route, status_code: res.statusCode });
    activeRequests.dec({ endpoint: route });
  });
  
  next();
});
```

### 6. Testing Strategy

#### Unit Tests

```typescript
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { VirtFusionService } from './virtfusion-service';

describe('VirtFusionService', () => {
  let service: VirtFusionService;
  let mockApi: jest.Mocked<VirtualFusionAPI>;

  beforeEach(() => {
    mockApi = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    } as any;
    
    service = new VirtFusionService(mockApi);
  });

  describe('getServer', () => {
    it('should return server data', async () => {
      const mockServer = { id: '123', name: 'test-server', status: 'active' };
      mockApi.get.mockResolvedValueOnce({ data: mockServer });
      
      const server = await service.getServer('123');
      
      expect(server).toEqual(mockServer);
      expect(mockApi.get).toHaveBeenCalledWith('/servers/123');
    });
    
    it('should throw not found error', async () => {
      mockApi.get.mockRejectedValueOnce({
        response: { status: 404, data: { message: 'Not Found' } }
      });
      
      await expect(service.getServer('999')).rejects.toThrow('Not Found');
    });
  });
});
```

#### Integration Tests

```typescript
describe('VirtFusion Integration', () => {
  let service: VirtFusionService;
  
  beforeAll(() => {
    // Setup test environment
    process.env.VIRT_FUSION_API_URL = 'https://test-api.virtfusion.example.com';
    process.env.VIRT_FUSION_API_KEY = 'test-key';
    process.env.VIRT_FUSION_API_SECRET = 'test-secret';
    
    service = new VirtFusionService();
  });
  
  it('should authenticate and fetch servers', async () => {
    const servers = await service.listServers();
    expect(Array.isArray(servers)).toBe(true);
  }, 10000); // 10s timeout
});
```

### 7. Documentation

#### API Documentation with OpenAPI

```yaml
openapi: 3.0.0
info:
  title: SkyPANEL VirtFusion Integration API
  version: 1.0.0
  description: API for managing VirtFusion resources

servers:
  - url: https://api.skypanel.example.com/v1
    description: Production server

paths:
  /servers:
    get:
      summary: List all servers
      tags: [Servers]
      parameters:
        - $ref: '#/components/parameters/page'
        - $ref: '#/components/parameters/limit'
      responses:
        '200':
          description: A list of servers
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/Server'
                  pagination:
                    $ref: '#/components/schemas/Pagination'
    post:
      summary: Create a new server
      tags: [Servers]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateServerRequest'
      responses:
        '201':
          description: Server created successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Server'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'

components:
  schemas:
    Server:
      type: object
      properties:
        id:
          type: string
          format: uuid
          example: '550e8400-e29b-41d4-a716-446655440000'
        name:
          type: string
          example: 'my-vps-1'
        status:
          type: string
          enum: [creating, active, suspended, deleted]
          example: 'active'
        # ... more properties ...
  
  # Reusable responses
  responses:
    BadRequest:
      description: Invalid request data
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
    
    Unauthorized:
      description: Unauthorized
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'

  # Reusable parameters
  parameters:
    page:
      in: query
      name: page
      schema:
        type: integer
        minimum: 1
        default: 1
      description: Page number for pagination
    
    limit:
      in: query
      name: limit
      schema:
        type: integer
        minimum: 1
        maximum: 100
        default: 20
      description: Number of items per page
```

### 8. Deployment and Operations

#### Health Checks

```typescript
app.get('/health', (req, res) => {
  const checks = {
    database: checkDatabaseConnection(),
    api: checkVirtFusionAPI(),
    // Add more checks as needed
  };
  
  Promise.all(Object.values(checks))
    .then(() => res.json({ status: 'healthy' }))
    .catch(error => {
      res.status(503).json({
        status: 'unhealthy',
        error: error.message
      });
    });
});
```

#### Graceful Shutdown

```typescript
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Starting graceful shutdown...');
  
  try {
    // Stop accepting new connections
    server.close(() => {
      logger.info('HTTP server closed');
    });
    
    // Close database connections
    await closeDatabaseConnections();
    
    // Close other resources
    await Promise.all([
      closeMessageQueue(),
      closeRedisConnection(),
    ]);
    
    logger.info('Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error({ error }, 'Error during shutdown');
    process.exit(1);
  }
});
```

## Monitoring and Logging

### 1. Structured Logging with Pino

```typescript
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  timestamp: () => `,"time":"${new Date().toISOString()}"`,
  formatters: {
    level: (label) => ({ level: label.toUpperCase() })
  },
  base: {
    service: 'skypanel-virtfusion',
    env: process.env.NODE_ENV
  },
  transport: process.env.NODE_ENV !== 'production' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname,service,env'
    }
  } : undefined
});

// Example usage
logger.info({ serverId: 'srv-123', action: 'provision' }, 'Starting server provisioning');
logger.error({ error, context: { userId: 'usr-456' } }, 'Failed to create server');
```

### 2. HTTP Request Logging Middleware

```typescript
import pinoHttp from 'pino-http';

const httpLogger = pinoHttp({
  logger,
  customLogLevel: (res, err) => {
    if (res.statusCode >= 400 && res.statusCode < 500) {
      return 'warn';
    } else if (res.statusCode >= 500 || err) {
      return 'error';
    }
    return 'info';
  },
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      query: req.query,
      params: req.params,
      headers: {
        'user-agent': req.headers['user-agent'],
        'x-request-id': req.headers['x-request-id']
      }
    }),
    res: (res) => ({
      statusCode: res.statusCode,
      headers: res.getHeaders()
    })
  }
});

// Use in Express app
app.use(httpLogger);
```

### 3. Metrics Collection with Prometheus

```typescript
import { collectDefaultMetrics, Gauge, Counter, Histogram } from 'prom-client';

// Collect default metrics (CPU, memory, etc.)
collectDefaultMetrics();

// Custom metrics
const requestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

const activeRequests = new Gauge({
  name: 'active_requests',
  help: 'Number of active requests',
  labelNames: ['endpoint']
});

// API request timing middleware
app.use((req, res, next) => {
  const end = requestDuration.startTimer();
  const route = req.route?.path || req.path;
  
  activeRequests.inc({ endpoint: route });
  
  res.on('finish', () => {
    end({
      method: req.method,
      route,
      status_code: res.statusCode
    });
    activeRequests.dec({ endpoint: route });
  });
  
  next();
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

### 4. Distributed Tracing with OpenTelemetry

```typescript
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';

const provider = new NodeTracerProvider({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'skypanel-virtfusion',
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development'
  })
});

const exporter = new JaegerExporter({
  endpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces'
});

provider.addSpanProcessor(new BatchSpanProcessor(exporter));
provider.register();

// Usage in route handlers
app.get('/api/servers/:id', async (req, res) => {
  const tracer = trace.getTracer('virtfusion-integration');
  return tracer.startActiveSpan('getServer', async (span) => {
    try {
      span.setAttribute('server.id', req.params.id);
      // ... server logic ...
      return res.json(server);
    } finally {
      span.end();
    }
  });
});
```

### 5. Log Aggregation with ELK Stack

1. **Filebeat Configuration** (`filebeat.yml`):

```yaml
filebeat.inputs:
- type: log
  paths:
    - /var/log/skypanel/*.log
  json.keys_under_root: true
  json.add_error_key: true
  json.message_key: message

output.logstash:
  hosts: ["logstash:5044"]
```

2. **Logstash Pipeline** (`logstash.conf`):

```conf
input {
  beats {
    port => 5044
  }
}

filter {
  if [service] == "skypanel-virtfusion" {
    grok {
      match => { "message" => "%{TIMESTAMP_ISO8601:timestamp} %{LOGLEVEL:log_level} %{GREEDYDATA:message}" }
    }
    
    date {
      match => ["timestamp", "ISO8601"]
      target => "@timestamp"
    }
    
    mutate {
      remove_field => ["timestamp"]
    }
  }
}

output {
  elasticsearch {
    hosts => ["http://elasticsearch:9200"]
    index => "skypanel-logs-%{+YYYY.MM.dd}"
  }
}
```

### 6. Grafana Dashboard

Create a dashboard with the following panels:

1. **Request Rate**
   - Query: `rate(http_requests_total[5m])`
   - Visualization: Time series
   - Panel Title: Requests per Second

2. **Error Rate**
   - Query: `sum(rate(http_request_errors_total[5m])) by (status_code)`
   - Visualization: Time series
   - Panel Title: Error Rate by Status Code

3. **Request Duration**
   - Query: `histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))`
   - Visualization: Time series
   - Panel Title: 95th Percentile Request Duration

4. **Active Requests**
   - Query: `active_requests`
   - Visualization: Gauge
   - Panel Title: Active Requests

### 7. Alerting with Prometheus Alertmanager

```yaml
# alertmanager.yml
route:
  receiver: 'slack-notifications'
  group_by: ['alertname', 'severity']
  group_wait: 10s
  group_interval: 5m
  repeat_interval: 3h

receivers:
- name: 'slack-notifications'
  slack_configs:
  - api_url: 'https://hooks.slack.com/services/...'
    channel: '#alerts'
    send_resolved: true
    title: '{{ template "slack.title" . }}'
    text: '{{ template "slack.text" . }}'

# prometheus.rules.yml
groups:
- name: virtfusion.rules
  rules:
  - alert: HighErrorRate
    expr: rate(http_request_errors_total[5m]) > 0.1
    for: 10m
    labels:
      severity: critical
    annotations:
      summary: "High error rate on {{ $labels.instance }}"
      description: "Error rate is {{ $value }}%"

  - alert: HighLatency
    expr: histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le)) > 1
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High latency on {{ $labels.instance }}"
      description: "99th percentile latency is {{ $value }}s"
```

### 8. Best Practices

1. **Logging**
   - Use structured logging with consistent field names
   - Include correlation IDs for tracing requests across services
   - Redact sensitive information (API keys, PII) before logging
   - Use appropriate log levels (DEBUG, INFO, WARN, ERROR, FATAL)

2. **Metrics**
   - Define clear naming conventions for metrics
   - Use labels/tags for high-cardinality dimensions
   - Monitor both application and system-level metrics
   - Set up alerts based on SLOs/SLIs

3. **Tracing**
   - Propagate trace context between services
   - Add custom spans for business logic
   - Sample traces based on volume and importance
   - Include relevant context in spans

4. **Alerting**
   - Define clear alert thresholds
   - Avoid alert fatigue by setting appropriate thresholds
   - Include runbooks in alert annotations
   - Regularly review and tune alert rules

5. **Performance**
   - Use sampling for high-volume operations
   - Buffer and batch log/metrics exports
   - Monitor the monitoring system itself
   - Set up capacity planning based on growth trends

## Versioning

The integration follows the VirtFusion API versioning scheme. Update the API version in the request headers when needed:

```typescript
const response = await this.api.get('/servers', {
  headers: {
    'Accept': 'application/vnd.virtfusion.v1+json'
  }
});
```

## Support

For issues with the VirtFusion integration:
1. Check the VirtFusion API documentation
2. Review the error logs
3. Contact VirtFusion support if the issue persists
4. Open an issue in the SkyPANEL repository if it appears to be an integration issue
