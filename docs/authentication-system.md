# Authentication System Documentation

## Overview

The SkyPANEL authentication system provides secure user authentication and authorization for both user and admin interfaces. It supports local authentication with username/password, email verification, password reset functionality, and Single Sign-On (SSO) integration with VirtFusion.

## Architecture

The authentication system consists of several components:

1. **Frontend Components**:
   - Login/Register forms
   - Password reset flow
   - Email verification
   - VirtFusion SSO handler

2. **Backend Services**:
   - Authentication service (auth-service.ts)
   - Authentication routes and middleware (auth.ts)
   - Email verification service (email-verification-service.ts)
   - Session management

3. **External Integrations**:
   - VirtFusion API for SSO authentication
   - Email service for verification and password reset

## Authentication Flow

### Local Authentication (Username/Password)

1. User enters credentials on the login form
2. Frontend sends credentials to `/api/auth/login` endpoint
3. Backend validates credentials against the database
4. If valid, a session is created and stored
5. Session cookie is sent to the client
6. Frontend redirects to the dashboard or appropriate page

### Registration Flow

1. User fills out registration form with username, email, and password
2. Frontend sends registration data to `/api/auth/register` endpoint
3. Backend validates the data and checks for existing users
4. If valid, a new user record is created in the database
5. Verification email is sent to the user's email address
6. User is redirected to verification pending page

### Email Verification

1. User receives verification email with a unique token
2. User clicks the verification link
3. Frontend sends the token to `/api/auth/verify` endpoint
4. Backend validates the token and marks the user as verified
5. User is redirected to login page or automatically logged in

### Password Reset

1. User requests password reset on the forgot password page
2. Frontend sends request to `/api/auth/forgot-password` endpoint
3. Backend generates a reset token and sends reset email
4. User clicks the reset link in the email
5. User enters new password on the reset page
6. Frontend sends new password and token to `/api/auth/reset-password` endpoint
7. Backend validates the token and updates the password

### VirtFusion SSO

1. User clicks "Login with VirtFusion" button
2. Frontend redirects to VirtFusion authentication URL
3. User authenticates on VirtFusion
4. VirtFusion redirects back to SkyPANEL with an authentication token
5. Frontend sends token to `/api/auth/virtfusion/callback` endpoint
6. Backend validates the token with VirtFusion API
7. If valid, user is logged in or a new account is created

## Implementation Details

### Frontend Components

#### AuthProvider (client/src/hooks/use-auth.tsx)

The `AuthProvider` component manages authentication state and provides authentication methods to the entire application through React Context.

```typescript
// Simplified example
const AuthProvider: React.FC = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const login = async (username, password) => {
    // Implementation
  };

  const logout = async () => {
    // Implementation
  };

  // Other authentication methods

  return (
    <AuthContext.Provider value={{ user, login, logout, /* other methods */ }}>
      {children}
    </AuthContext.Provider>
  );
};
```

#### VirtFusionSsoHandler (client/src/components/VirtFusionSsoHandler.tsx)

This component handles the SSO callback from VirtFusion and processes the authentication token.

### Backend Services

#### Authentication Service (server/auth-service.ts)

This service handles user authentication, registration, and session management.

Key functions:
- `authenticateUser(username, password)`: Validates user credentials
- `registerUser(userData)`: Creates a new user account
- `verifyEmail(token)`: Verifies a user's email address
- `resetPassword(token, newPassword)`: Resets a user's password
- `generateAuthToken()`: Generates authentication tokens

#### Email Verification Service (server/email-verification-service.ts)

This service handles email verification and password reset emails.

Key functions:
- `sendVerificationEmail(user)`: Sends a verification email
- `sendPasswordResetEmail(user)`: Sends a password reset email
- `verifyToken(token)`: Verifies a token's validity

#### VirtFusion Integration (server/virtfusion-user-service.ts)

This service handles integration with VirtFusion for SSO authentication.

Key functions:
- `authenticateWithVirtFusion(token)`: Authenticates a user with VirtFusion
- `createUserFromVirtFusion(virtFusionUser)`: Creates a new user from VirtFusion data

## Security Considerations

1. **Password Storage**: Passwords are hashed using bcrypt before storage
2. **Rate Limiting**: Login and verification attempts are rate-limited to prevent brute force attacks
3. **Token Expiration**: All verification and reset tokens have expiration times
4. **CSRF Protection**: Cross-Site Request Forgery protection is implemented
5. **Session Management**: Secure session cookies with appropriate flags

## Configuration

Authentication-related configuration is stored in environment variables:

```
# Session Management
SESSION_SECRET="your-secret-key"

# VirtFusion API Integration
VIRTFUSION_API_URL="https://virtfusion-api-url"
VIRTFUSION_API_TOKEN="your-virtfusion-token"
```

## Troubleshooting

### Common Issues

1. **Login Failures**:
   - Check if the user exists in the database
   - Verify that the password is correct
   - Ensure the user account is not locked or suspended

2. **Email Verification Issues**:
   - Check if the verification token is valid and not expired
   - Verify that the email service is configured correctly
   - Check email logs for delivery issues

3. **SSO Authentication Problems**:
   - Verify VirtFusion API credentials
   - Check network connectivity to VirtFusion API
   - Ensure the callback URL is configured correctly in VirtFusion

## API Reference

### Authentication Endpoints

| Endpoint | Method | Description | Request Body | Response |
|----------|--------|-------------|--------------|----------|
| `/api/auth/login` | POST | Authenticates a user | `{ username, password }` | `{ user, token }` |
| `/api/auth/register` | POST | Registers a new user | `{ username, email, password }` | `{ success, message }` |
| `/api/auth/logout` | POST | Logs out a user | None | `{ success }` |
| `/api/auth/verify` | GET | Verifies an email address | Query param: `token` | `{ success, message }` |
| `/api/auth/forgot-password` | POST | Initiates password reset | `{ email }` | `{ success, message }` |
| `/api/auth/reset-password` | POST | Resets a password | `{ token, password }` | `{ success, message }` |
| `/api/auth/virtfusion/callback` | GET | Handles VirtFusion SSO callback | Query param: `token` | Redirect |
| `/api/auth/me` | GET | Gets current user info | None | `{ user }` |