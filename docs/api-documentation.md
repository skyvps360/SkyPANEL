# SkyPANEL API Documentation

This document provides comprehensive documentation for the SkyPANEL API, including available endpoints, request/response formats, and authentication requirements.

## Base URL

All API endpoints are prefixed with `/api`.

## Authentication

SkyPANEL uses JWT (JSON Web Tokens) for authentication. Include the token in the `Authorization` header:

```
Authorization: Bearer your_jwt_token_here
```

## Response Format

All API responses follow a standard format:

```typescript
{
  success: boolean;      // Indicates if the request was successful
  data?: any;            // Response data (if successful)
  error?: {
    code: string;       // Error code
    message: string;    // Human-readable error message
    details?: any;      // Additional error details
  };
}
```

## API Endpoints

### Authentication

#### `POST /api/auth/login`

Authenticate a user and retrieve an access token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "yourpassword"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "jwt_token_here",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "role": "user"
    }
  }
}
```

### User Management

#### `GET /api/users/me`

Get the currently authenticated user's profile.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "user",
    "createdAt": "2023-01-01T00:00:00.000Z"
  }
}
```

#### `PUT /api/users/me`

Update the authenticated user's profile.

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "currentPassword": "currentpassword",
  "newPassword": "newsecurepassword"
}
```

### Server Management

#### `GET /api/servers`

List all servers for the authenticated user.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "server-123",
      "name": "My VPS",
      "status": "running",
      "ipAddress": "192.168.1.100",
      "plan": "Basic",
      "createdAt": "2023-01-01T00:00:00.000Z"
    }
  ]
}
```

#### `POST /api/servers/:id/power`

Control server power state.

**Request Body:**
```json
{
  "action": "start" // or "stop", "restart", "shutdown"
}
```

### Billing

#### `GET /api/billing/invoices`

List all invoices for the authenticated user.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "inv_123",
      "amount": 9.99,
      "status": "paid",
      "dueDate": "2023-02-01T00:00:00.000Z",
      "createdAt": "2023-01-15T00:00:00.000Z"
    }
  ]
}
```

## Error Handling

### Error Responses

| Status Code | Error Code | Description |
|-------------|------------|-------------|
| 400 | VALIDATION_ERROR | Request validation failed |
| 401 | UNAUTHORIZED | Authentication required |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Resource not found |
| 500 | INTERNAL_ERROR | Server error |

### Example Error Response

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "The requested resource was not found",
    "details": {
      "resource": "server",
      "id": "nonexistent-id"
    }
  }
}
```

## Rate Limiting

- All API endpoints are rate limited to 1000 requests per 15 minutes per IP address.
- Authentication endpoints have a lower limit of 10 requests per minute.

## Versioning

API versioning is handled through the `Accept` header:

```
Accept: application/vnd.skypanel.v1+json
```

## Webhooks

SkyPANEL supports webhooks for various events. Configure webhook endpoints in the admin panel to receive real-time notifications.

### Available Webhook Events

- `server.created`
- `server.updated`
- `server.deleted`
- `invoice.created`
- `invoice.paid`
- `ticket.created`
- `ticket.updated`

### Webhook Payload Example

```json
{
  "event": "server.created",
  "data": {
    "id": "server-123",
    "name": "My New Server",
    "status": "provisioning"
  },
  "timestamp": "2023-01-01T00:00:00.000Z"
}
```
