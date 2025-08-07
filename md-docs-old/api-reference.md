# API Reference

## Overview
This document provides a comprehensive reference for the SkyPANEL REST API, including authentication, endpoints, request/response formats, and error handling.

## Table of Contents
- [Authentication](#authentication)
- [Base URL](#base-url)
- [Response Format](#response-format)
- [Error Handling](#error-handling)
- [Pagination](#pagination)
- [Rate Limiting](#rate-limiting)
- [Endpoints](#endpoints)
  - [Authentication](#authentication-endpoints)
  - [Users](#users)
  - [Servers](#servers)
  - [Billing](#billing)
  - [Support](#support)
  - [Admin](#admin)

## Authentication

### API Keys
```http
GET /api/v1/servers
Authorization: Bearer your_api_key_here
```

### OAuth 2.0
```http
POST /oauth/token
grant_type=client_credentials&client_id=CLIENT_ID&client_secret=CLIENT_SECRET
```

### JWT (JSON Web Tokens)
```http
GET /api/v1/users/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Base URL
All API endpoints are relative to the base URL:
```
https://api.skyvps360.com/v1
```

## Response Format
All successful responses follow this format:
```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

## Error Handling

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "invalid_request",
    "message": "Invalid request parameters",
    "details": {
      "email": ["Must be a valid email address"]
    }
  }
}
```

### Common Error Codes
| Code | Status | Description |
|------|--------|-------------|
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Authentication required |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

## Pagination
List endpoints support pagination:
```json
{
  "data": [],
  "meta": {
    "total": 100,
    "per_page": 25,
    "current_page": 1,
    "last_page": 4,
    "from": 1,
    "to": 25
  },
  "links": {
    "first": "https://api.example.com/v1/resource?page=1",
    "last": "https://api.example.com/v1/resource?page=4",
    "prev": null,
    "next": "https://api.example.com/v1/resource?page=2"
  }
}
```

## Rate Limiting
- 100 requests per minute per IP
- 1000 requests per minute per API key
- Headers:
  - `X-RateLimit-Limit`: Request limit
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Reset timestamp

## Endpoints

### Authentication

#### Login
```http
POST /auth/login
```
**Request Body**
```json
{
  "email": "user@example.com",
  "password": "your_password"
}
```

**Response**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "def50200ae5d6a..."
}
```

#### Refresh Token
```http
POST /auth/refresh
```
**Request Body**
```json
{
  "refresh_token": "def50200ae5d6a..."
}
```

### Users

#### Get Current User
```http
GET /users/me
```

**Response**
```json
{
  "id": "usr_123",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "user"
}
```

#### Update User
```http
PUT /users/me
```
**Request Body**
```json
{
  "name": "New Name",
  "email": "new.email@example.com"
}
```

### Servers

#### List Servers
```http
GET /servers
```

**Query Parameters**
- `status`: Filter by status (running, stopped, etc.)
- `page`: Page number
- `per_page`: Items per page

**Response**
```json
{
  "data": [
    {
      "id": "srv_123",
      "name": "My Server",
      "status": "running",
      "ip_address": "192.168.1.1",
      "created_at": "2023-01-01T00:00:00Z"
    }
  ]
}
```

#### Create Server
```http
POST /servers
```
**Request Body**
```json
{
  "name": "New Server",
  "plan_id": "plan_123",
  "region": "nyc1"
}
```

### Billing

#### Get Invoices
```http
GET /billing/invoices
```

#### Create Payment Method
```http
POST /billing/payment-methods
```
**Request Body**
```json
{
  "type": "card",
  "card": {
    "number": "4242424242424242",
    "exp_month": 12,
    "exp_year": 2025,
    "cvc": "123"
  }
}
```

### Support

#### Create Ticket
```http
POST /support/tickets
```
**Request Body**
```json
{
  "subject": "Help needed",
  "message": "I need help with...",
  "priority": "high"
}
```

### Admin

#### List Users (Admin)
```http
GET /admin/users
```

#### Update User (Admin)
```http
PUT /admin/users/{id}
```
**Request Body**
```json
{
  "role": "admin"
}
```

### Billing Endpoints

#### Transaction Management
```http
GET /api/transactions                    # List user transactions
GET /api/transactions/:id                # Get transaction details (includes user info for admins)
GET /api/transactions/export             # Export transactions as PDF
POST /api/billing/add-credits           # Add credits to account
GET /api/billing/balance                # Get account balance
GET /api/billing/usage/last30days       # Get 30-day usage statistics
```

#### Transaction Details Response (Admin)
When an admin requests transaction details, the response includes user information:

```json
{
  "success": true,
  "data": {
    "id": 123,
    "userId": 456,
    "amount": 50.00,
    "type": "credit_purchase",
    "description": "Credit purchase via PayPal",
    "status": "completed",
    "paymentMethod": "paypal",
    "paymentId": "PAY-123456789",
    "createdAt": "2024-01-15T10:30:00Z",
    "user": {
      "id": 456,
      "username": "john_doe",
      "email": "john@example.com"
    }
  }
}
```

#### Transaction Details Response (User)
When a regular user requests their own transaction details:

```json
{
  "success": true,
  "data": {
    "id": 123,
    "userId": 456,
    "amount": 50.00,
    "type": "credit_purchase",
    "description": "Credit purchase via PayPal",
    "status": "completed",
    "paymentMethod": "paypal",
    "paymentId": "PAY-123456789",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

## Webhooks

### Events
- `server.created`
- `server.updated`
- `server.deleted`
- `invoice.paid`
- `payment.failed`

### Webhook Payload
```json
{
  "event": "server.created",
  "data": {
    "id": "srv_123",
    "name": "New Server"
  },
  "created_at": "2023-01-01T00:00:00Z"
}
```

## SDKs

### JavaScript/Node.js
```javascript
import { SkyPanel } from 'skypanel-sdk';

const client = new SkyPanel({
  apiKey: 'your_api_key'
});

// Example: List servers
const servers = await client.servers.list();
```

### Python
```python
from skypanel import SkyPanel

client = SkyPanel(api_key='your_api_key')
servers = client.servers.list()
```

## Best Practices

### Error Handling
- Always check response status
- Implement retry logic for 5xx errors
- Use exponential backoff for rate limits

### Performance
- Use pagination for large datasets
- Request only needed fields
- Cache responses when appropriate

### Security
- Never expose API keys client-side
- Use environment variables for configuration
- Rotate API keys regularly
- Implement IP whitelisting

## Support
For API support, contact api-support@skyvps360.com or visit our [API status page](#).
