# SSO OAuth System Documentation

## Overview

The Single Sign-On (SSO) OAuth system in SkyPANEL provides secure authentication through third-party identity providers, allowing users to log in using their existing accounts from popular services like Google, GitHub, Discord, and LinkedIn. The system supports both login and account linking functionality.

## Table of Contents

- [System Architecture](#system-architecture)
- [Supported Providers](#supported-providers)
- [Database Schema](#database-schema)
- [Authentication Flow](#authentication-flow)
- [API Endpoints](#api-endpoints)
- [Frontend Components](#frontend-components)
- [Security Features](#security-features)
- [Configuration](#configuration)
- [Error Handling](#error-handling)
- [Analytics and Logging](#analytics-and-logging)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## System Architecture

### Components

1. **OAuth Service** (`server/services/auth/oauth-service.ts`)
   - Core business logic for OAuth operations
   - Provider management and configuration
   - User account linking and unlinking
   - Analytics and logging

2. **OAuth Routes** (`server/routes/oauth-routes.ts`)
   - RESTful API endpoints for OAuth operations
   - Provider configuration management
   - Authentication flow handling
   - Callback processing

3. **Database Schema** (`shared/schemas/oauth-schema.ts`)
   - OAuth providers table
   - User OAuth accounts table
   - OAuth login logs table

4. **Frontend Components**
   - OAuth login buttons (`client/src/components/auth/OAuthLoginButtons.tsx`)
   - Account linking interface
   - Provider management (admin)

### Data Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│             │     │             │     │             │     │             │
│   User      │────▶│  Frontend   │────▶│  Backend    │────▶│  Provider   │
│             │     │             │     │             │     │             │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
       ▲                   ▲                   │                   │
       │                   │                   │                   │
       └───────────────────┴───────────────────┘                   │
                       ▲                                           │
                       │                                           │
                       └───────────────────────────────────────────┘
```

## Supported Providers

### Currently Supported

1. **Google OAuth 2.0**
   - Provider Name: `google`
   - Scope: `openid email profile`
   - User Info: Email, name, profile picture

2. **GitHub OAuth 2.0**
   - Provider Name: `github`
   - Scope: `read:user user:email`
   - User Info: Username, email, profile picture

3. **Discord OAuth 2.0**
   - Provider Name: `discord`
   - Scope: `identify email`
   - User Info: Username, email, avatar

4. **LinkedIn OAuth 2.0**
   - Provider Name: `linkedin`
   - Scope: `r_liteprofile r_emailaddress`
   - User Info: Name, email, profile picture

### Provider Configuration

Each provider requires the following configuration:

```typescript
interface OAuthProviderConfig {
  clientId: string;        // OAuth client ID from provider
  clientSecret: string;    // OAuth client secret from provider
  redirectUrl: string;     // Callback URL for OAuth flow
  scope: string;          // OAuth scopes to request
  enabled: boolean;       // Whether provider is active
}
```

## Database Schema

### OAuth Providers Table

```sql
CREATE TABLE oauth_providers (
  id SERIAL PRIMARY KEY,
  provider_name VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  client_id VARCHAR(255) NOT NULL,
  client_secret VARCHAR(255) NOT NULL,
  redirect_url VARCHAR(255) NOT NULL,
  scope TEXT DEFAULT '',
  enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### User OAuth Accounts Table

```sql
CREATE TABLE user_oauth_accounts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider_name VARCHAR(255) NOT NULL,
  provider_user_id VARCHAR(255) NOT NULL,
  provider_user_email VARCHAR(255),
  provider_user_name VARCHAR(255),
  provider_avatar_url VARCHAR(255),
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  linked_at TIMESTAMP DEFAULT NOW(),
  last_used_at TIMESTAMP
);
```

### OAuth Login Logs Table

```sql
CREATE TABLE oauth_login_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  provider_name VARCHAR(255) NOT NULL,
  provider_user_id VARCHAR(255),
  success BOOLEAN NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Authentication Flow

### 1. Login Flow

```
1. User clicks OAuth provider button
2. Frontend requests auth URL from backend
3. Backend generates state parameter and stores in session
4. User is redirected to provider's OAuth page
5. User authenticates with provider
6. Provider redirects back to callback URL with code
7. Backend exchanges code for access token
8. Backend fetches user info from provider
9. Backend checks if user exists in system
10. If user exists, log them in and redirect to dashboard
11. If user doesn't exist, redirect to login with error
```

### 2. Account Linking Flow

```
1. User is already logged in to SkyPANEL
2. User clicks OAuth provider button
3. Frontend requests auth URL from backend
4. Backend stores user ID in session for linking
5. User is redirected to provider's OAuth page
6. User authenticates with provider
7. Provider redirects back to callback URL with code
8. Backend exchanges code for access token
9. Backend fetches user info from provider
10. Backend links OAuth account to existing user
11. User is redirected back to dashboard with success message
```

### 3. State Parameter Security

The system uses cryptographically secure state parameters to prevent CSRF attacks:

```typescript
// Generate state parameter
generateState(): string {
  return randomBytes(32).toString('hex');
}

// Validate state parameter
validateState(state: string): boolean {
  return state.length === 64 && /^[a-f0-9]+$/i.test(state);
}
```

## API Endpoints

### Public Endpoints

#### `GET /api/oauth/providers/enabled/public`
Returns list of enabled OAuth providers for login page.

**Response:**
```json
{
  "providers": [
    {
      "providerName": "google",
      "displayName": "Google",
      "enabled": true
    }
  ]
}
```

#### `GET /api/oauth/login/:providerName`
Initiates OAuth login flow for specified provider.

**Response:**
```json
{
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?..."
}
```

#### `GET /api/oauth/callback/:providerName`
OAuth callback endpoint (handled by provider).

### Protected Endpoints

#### `GET /api/oauth/providers` (Admin Only)
Returns all OAuth providers with configuration.

#### `PUT /api/oauth/providers/:providerName` (Admin Only)
Updates OAuth provider configuration.

**Request Body:**
```json
{
  "clientId": "your_client_id",
  "clientSecret": "your_client_secret",
  "redirectUrl": "https://yourdomain.com/api/oauth/callback/google",
  "scope": "openid email profile",
  "enabled": true
}
```

#### `GET /api/oauth/accounts`
Returns user's linked OAuth accounts.

#### `DELETE /api/oauth/accounts/:providerName`
Unlinks OAuth account from user.

#### `GET /api/oauth/analytics` (Admin Only)
Returns OAuth usage analytics.

## Frontend Components

### OAuth Login Buttons

The `OAuthLoginButtons` component displays enabled OAuth providers on the login page:

```tsx
export function OAuthLoginButtons() {
  const { data: providers = [] } = useQuery({
    queryKey: ['/api/oauth/providers/enabled/public'],
    queryFn: async () => {
      const response = await apiRequest('/api/oauth/providers/enabled/public');
      return response.providers || [];
    }
  });

  const handleProviderClick = async (providerName: string) => {
    const response = await apiRequest(`/api/oauth/login/${providerName}`);
    window.location.href = response.authUrl;
  };

  return (
    <div className="space-y-3">
      {providers.map((provider) => (
        <Button
          key={provider.providerName}
          onClick={() => handleProviderClick(provider.providerName)}
        >
          Continue with {provider.displayName}
        </Button>
      ))}
    </div>
  );
}
```

### Account Linking Interface

Users can link/unlink OAuth accounts from their profile page:

```tsx
// Link OAuth account
const linkAccount = async (providerName: string) => {
  const response = await apiRequest(`/api/oauth/login/${providerName}`);
  window.location.href = response.authUrl;
};

// Unlink OAuth account
const unlinkAccount = async (providerName: string) => {
  await apiRequest(`/api/oauth/accounts/${providerName}`, {
    method: 'DELETE'
  });
};
```

## Security Features

### 1. State Parameter Validation

- Cryptographically secure random state generation
- State parameter validation on callback
- CSRF protection against malicious redirects

### 2. Session Security

- Secure session management with HTTP-only cookies
- Session-based state parameter storage
- Automatic session cleanup on logout

### 3. Token Security

- Access tokens stored securely in database
- Token expiration handling
- Secure token refresh mechanism

### 4. Input Validation

- Zod schema validation for all inputs
- Provider name validation
- URL validation for redirect URLs

### 5. Rate Limiting

- OAuth callback rate limiting
- Login attempt rate limiting
- Provider-specific rate limiting

## Configuration

### Environment Variables

```env
# Session configuration
SESSION_SECRET=your_session_secret_here

# OAuth provider URLs (optional, defaults used if not set)
GOOGLE_OAUTH_URL=https://accounts.google.com/o/oauth2/v2/auth
GITHUB_OAUTH_URL=https://github.com/login/oauth/authorize
DISCORD_OAUTH_URL=https://discord.com/api/oauth2/authorize
LINKEDIN_OAUTH_URL=https://www.linkedin.com/oauth/v2/authorization
```

### Provider Setup

#### Google OAuth 2.0

1. Create project in Google Cloud Console
2. Enable Google+ API
3. Create OAuth 2.0 credentials
4. Add authorized redirect URIs
5. Configure in SkyPANEL admin panel

#### GitHub OAuth 2.0

1. Go to GitHub Settings > Developer settings > OAuth Apps
2. Create new OAuth App
3. Set Authorization callback URL
4. Configure in SkyPANEL admin panel

#### Discord OAuth 2.0

1. Go to Discord Developer Portal
2. Create new application
3. Add OAuth2 redirect URL
4. Configure in SkyPANEL admin panel

#### LinkedIn OAuth 2.0

1. Go to LinkedIn Developers
2. Create new app
3. Configure OAuth 2.0 settings
4. Add redirect URLs
5. Configure in SkyPANEL admin panel

## Error Handling

### Common Error Scenarios

1. **Invalid State Parameter**
   - Error: `invalid_state`
   - Cause: CSRF attack or session expired
   - Resolution: Restart OAuth flow

2. **Provider Not Available**
   - Error: `provider_not_available`
   - Cause: Provider disabled or misconfigured
   - Resolution: Contact administrator

3. **Token Exchange Failed**
   - Error: `token_exchange_failed`
   - Cause: Invalid client credentials or expired code
   - Resolution: Check provider configuration

4. **User Info Failed**
   - Error: `user_info_failed`
   - Cause: Provider API issues or insufficient scope
   - Resolution: Check provider configuration and scopes

5. **Account Linking Required**
   - Error: `link_required`
   - Cause: OAuth account not linked to existing user
   - Resolution: Log in with username/password first

### Error Response Format

```json
{
  "error": "error_code",
  "message": "Human-readable error message",
  "details": {
    "provider": "google",
    "timestamp": "2023-01-01T00:00:00Z"
  }
}
```

## Analytics and Logging

### OAuth Activity Logging

All OAuth activities are logged for security and analytics:

```typescript
interface OAuthLogEntry {
  userId?: number;
  providerName: string;
  providerUserId?: string;
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
  errorMessage?: string;
  createdAt: Date;
}
```

### Analytics Dashboard

Admin analytics include:

- OAuth login success rates by provider
- Most popular OAuth providers
- Failed login attempts and reasons
- User account linking statistics
- Recent OAuth activity

### Log Retention

- OAuth logs retained for 90 days
- Failed attempts logged indefinitely
- Successful logins logged for 30 days
- Account linking events logged permanently

## Best Practices

### 1. Provider Configuration

- Use HTTPS for all redirect URLs
- Set appropriate OAuth scopes (minimal required)
- Regularly rotate client secrets
- Monitor provider API quotas

### 2. Security

- Implement rate limiting on OAuth endpoints
- Log all OAuth activities for audit
- Validate all provider responses
- Use secure session management

### 3. User Experience

- Provide clear error messages
- Support account unlinking
- Show OAuth account status in profile
- Handle provider downtime gracefully

### 4. Development

- Test with provider sandbox environments
- Implement proper error handling
- Use TypeScript for type safety
- Follow OAuth 2.0 specification

## Troubleshooting

### Common Issues

1. **OAuth Callback Not Working**
   - Check redirect URL configuration
   - Verify provider client credentials
   - Check server logs for errors
   - Validate state parameter handling

2. **User Not Found After OAuth**
   - Check if user exists in database
   - Verify OAuth account linking
   - Check provider user ID mapping
   - Review OAuth callback logs

3. **Provider Configuration Issues**
   - Verify client ID and secret
   - Check redirect URL format
   - Validate OAuth scopes
   - Test provider API connectivity

4. **Session Issues**
   - Check session configuration
   - Verify cookie settings
   - Review session storage
   - Check for session conflicts

### Debug Commands

```sql
-- Check OAuth providers
SELECT * FROM oauth_providers WHERE enabled = true;

-- Check user OAuth accounts
SELECT u.username, oa.provider_name, oa.provider_user_id 
FROM user_oauth_accounts oa 
JOIN users u ON oa.user_id = u.id;

-- Check recent OAuth activity
SELECT * FROM oauth_login_logs 
ORDER BY created_at DESC 
LIMIT 10;
```

### Provider-Specific Issues

#### Google OAuth
- Verify Google+ API is enabled
- Check OAuth consent screen configuration
- Validate redirect URI format

#### GitHub OAuth
- Ensure app is properly configured
- Check callback URL matches exactly
- Verify OAuth app permissions

#### Discord OAuth
- Check bot permissions
- Verify redirect URI format
- Ensure app is public if needed

#### LinkedIn OAuth
- Verify app is approved
- Check OAuth 2.0 settings
- Validate redirect URLs

## Integration with Other Systems

### VirtFusion SSO Integration

The OAuth system integrates with VirtFusion SSO for seamless server management:

1. User logs in via OAuth
2. SkyPANEL creates/updates VirtFusion account
3. User can access VirtFusion panel directly
4. Single sign-on across both systems

### Email Verification

OAuth users still require email verification:
- OAuth login triggers email verification if needed
- Verification required for full account access
- OAuth accounts linked after verification

### Account Management

OAuth accounts integrate with existing account features:
- Profile management
- Billing and transactions
- Server management
- Support ticket system

## Future Enhancements

### Planned Features

1. **Additional Providers**
   - Microsoft Azure AD
   - Apple Sign-In
   - Twitter OAuth
   - Custom OAuth providers

2. **Advanced Features**
   - OAuth account merging
   - Multi-provider linking
   - OAuth-based team management
   - Provider-specific permissions

3. **Security Enhancements**
   - OAuth token encryption
   - Advanced rate limiting
   - Provider-specific security policies
   - OAuth audit trails

4. **User Experience**
   - OAuth account recovery
   - Provider-specific branding
   - OAuth login preferences
   - Social login analytics

## Conclusion

The SSO OAuth system in SkyPANEL provides a secure, flexible, and user-friendly authentication solution that integrates seamlessly with the existing platform. With support for multiple providers, comprehensive security features, and detailed analytics, it offers a robust foundation for modern authentication needs.

For additional support or feature requests, please refer to the main SkyPANEL documentation or contact the development team. 