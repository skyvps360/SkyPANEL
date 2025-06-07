# Authentication System

## Overview
The authentication system in SkyPANEL provides secure user authentication, authorization, and session management. It integrates with VirtFusion for VPS account management and supports various authentication methods.

## Table of Contents
- [Authentication Flow](#authentication-flow)
- [User Registration](#user-registration)
- [Login Process](#login-process)
- [Password Management](#password-management)
- [Session Management](#session-management)
- [Role-Based Access Control](#role-based-access-control)
- [Security Measures](#security-measures)
- [API Authentication](#api-authentication)
- [Integration with VirtFusion](#integration-with-virtfusion)
- [Error Handling](#error-handling)
- [Configuration](#configuration)

## Authentication Flow

### Standard Flow
1. User submits credentials (email/password)
2. Server validates credentials against database
3. If valid, creates JWT token
4. Token is sent to client and stored securely
5. Subsequent requests include token in Authorization header

### OAuth Flow
1. User selects OAuth provider (Google, GitHub, etc.)
2. Redirect to provider's login page
3. After successful authentication, redirects back to app with code
4. Server exchanges code for access token
5. User is authenticated and session is created

## User Registration

### Registration Process
1. User submits registration form (email, password, etc.)
2. System validates input
3. Creates user in database with hashed password
4. Sends verification email
5. After email verification, creates VirtFusion account

### Required Fields
- Email (unique)
- Username (unique)
- Password (hashed)
- First/Last Name
- Terms acceptance

## Login Process

### Credential Verification
1. User submits email/username and password
2. System finds user by email/username
3. Verifies password hash
4. Checks if account is verified
5. Checks if account is locked

### Session Creation
1. Generates JWT with user claims
2. Sets secure, HTTP-only cookie
3. Returns user data (excluding sensitive info)
4. Updates last login timestamp

## Password Management

### Password Requirements
- Minimum 12 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character
- Not in common passwords list

### Reset Password Flow
1. User requests password reset
2. System generates reset token (expires in 1h)
3. Sends email with reset link
4. User submits new password
5. System validates token and updates password

## Session Management

### JWT Claims
```typescript
{
  userId: string;
  email: string;
  roles: string[];
  iat: number; // Issued at
  exp: number; // Expiration time
}
```

### Session Security
- Token expiration: 24h
- Refresh token rotation
- Token invalidation on logout
- Device fingerprinting
- IP-based security

## Role-Based Access Control

### User Roles
1. **Super Admin**
   - Full system access
   - Can manage all resources
   - Can assign any role

2. **Admin**
   - Manage users and resources
   - Limited to assigned scopes
   - Cannot manage other admins

3. **User**
   - Regular user access
   - Limited to own resources
   - Can create/manage own API keys

### Permission System
- Resource-based permissions
- Granular access control
- Permission inheritance
- Temporary permissions

## Security Measures

### Protection Against Attacks
- Rate limiting
- Account lockout after failed attempts
- CSRF protection
- XSS prevention
- Secure cookie settings
- HSTS

### Data Protection
- Password hashing (Argon2id)
- Encryption at rest
- Secure token generation
- Secure headers

## API Authentication

### Authentication Methods
1. **Session Cookie** (web interface)
2. **JWT** (mobile/API clients)
3. **API Keys** (machine-to-machine)

### API Key Management
- Create/revoke keys
- Set permissions
- Usage limits
- Last used tracking

## Integration with VirtFusion

### Account Synchronization
1. User registers in SkyPANEL
2. After email verification, creates VirtFusion account
3. Syncs user details
4. Handles password changes

### Single Sign-On
1. Initiate SSO from SkyPANEL
2. Generate JWT for VirtFusion
3. Redirect to VirtFusion with token
4. Auto-login to VirtFusion

## Error Handling

### Common Errors
- `401 Unauthorized`: Invalid or missing token
- `403 Forbidden`: Insufficient permissions
- `429 Too Many Requests`: Rate limit exceeded
- `400 Bad Request`: Invalid input

### Error Responses
```json
{
  "error": {
    "code": "AUTH_INVALID_CREDENTIALS",
    "message": "Invalid email or password",
    "details": {}
  }
}
```

## Configuration

### Environment Variables
```env
# Authentication
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=24h
COOKIE_SECRET=your_cookie_secret

# OAuth Providers
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_secret
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_secret

# Security
RATE_LIMIT_WINDOW_MS=900000  // 15 minutes
MAX_REQUESTS_PER_WINDOW=100
ACCOUNT_LOCKOUT_ATTEMPTS=5
ACCOUNT_LOCKOUT_MINUTES=30
```

### Security Headers
```typescript
{
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Content-Security-Policy': "default-src 'self'"
}
```

## Best Practices

### Development
- Never log sensitive information
- Use secure comparison for tokens
- Validate all inputs
- Keep dependencies updated

### Operations
- Rotate secrets regularly
- Monitor authentication attempts
- Review access logs
- Regular security audits

## Troubleshooting

### Common Issues
1. **Login Fails**
   - Check user exists
   - Verify password hash
   - Check account status

2. **Token Expiry**
   - Verify token expiration
   - Check system time
   - Validate token signature

3. **CORS Issues**
   - Verify allowed origins
   - Check preflight requests
   - Validate headers

## Support
For additional help, contact the security team or refer to the security documentation.
