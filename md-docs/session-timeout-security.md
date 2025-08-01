# Session Timeout Security Enhancement

## Overview

This document describes the implementation of automatic session timeout functionality to strengthen the security of the SkyPANEL application. Users are now automatically logged out after 1 hour of inactivity, with an exception for administrators on admin routes.

## Security Benefits

### 1. Reduced Risk of Unauthorized Access
- **Automatic Logout**: Sessions expire after 1 hour, preventing unauthorized access to unattended sessions
- **Idle Session Protection**: Protects against scenarios where users forget to log out on shared computers
- **Reduced Attack Window**: Limits the time window for potential session hijacking attacks
- **Admin Exemption**: Administrators are exempt from auto-logout when on admin routes to prevent disruption of administrative tasks

### 2. Enhanced Cookie Security
- **httpOnly**: Prevents XSS attacks by making cookies inaccessible to JavaScript
- **secure**: Ensures cookies are only sent over HTTPS in production
- **sameSite**: Provides CSRF protection by controlling cross-site cookie behavior

## Implementation Details

### Backend Configuration

**File**: `server/auth.ts`

```typescript
const sessionSettings: session.SessionOptions = {
  secret: process.env.SESSION_SECRET!,
  resave: false,
  saveUninitialized: false,
  store: storage.sessionStore,
  cookie: {
    maxAge: 60 * 60 * 1000, // 1 hour in milliseconds (3600000ms)
    httpOnly: true, // Prevent XSS attacks
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'lax' // CSRF protection
  }
};
```

### Frontend Session Monitoring

**File**: `client/src/hooks/useSessionTimeout.ts`

The frontend includes a session monitoring hook that:
- Checks session validity every 5 minutes
- Monitors when the user returns to the tab (visibility change)
- Automatically logs out users when sessions expire
- Provides user-friendly notifications
- **Exempts administrators from auto-logout when on admin routes** (`/admin/*`)

### Key Features

1. **Automatic Detection**: Detects expired sessions through API responses
2. **Graceful Logout**: Handles logout process smoothly with user notifications
3. **Background Monitoring**: Continuously monitors session status without user intervention
4. **Tab Visibility Handling**: Checks session when user returns to the application tab
5. **Admin Exemption**: Administrators are not auto-logged out when on admin routes

## User Experience

### Session Expiration Flow

1. **Session Expires**: After 1 hour of inactivity
2. **Detection**: Frontend detects expired session on next API call
3. **Automatic Logout**: User is automatically logged out (except admins on admin routes)
4. **Notification**: Toast notification informs user of session expiration
5. **Redirect**: User is redirected to login page

### Admin Exemption

Administrators with the `admin` role are exempt from automatic logout when:
- They are on any route starting with `/admin`
- This prevents disruption of administrative tasks that may take longer than 1 hour

### Notification Message

```
Title: "Session Expired"
Description: "You have been automatically logged out for security reasons. Please log in again."
```

## Configuration

### Environment Variables

- `SESSION_SECRET`: Required for session encryption
- `NODE_ENV`: Determines if secure cookies are enabled

### Timeout Duration

The session timeout is currently set to **1 hour (3600 seconds)**. This can be modified in the `maxAge` property:

```typescript
maxAge: 60 * 60 * 1000, // 1 hour
// To change to 2 hours: 2 * 60 * 60 * 1000
// To change to 30 minutes: 30 * 60 * 1000
```

## Testing

### Test Script

**File**: `scripts/test-session-timeout.ts`

Run the test script to verify session timeout configuration:

```bash
npx tsx scripts/test-session-timeout.ts
```

The script verifies:
- Session table structure
- Active sessions and their expiration times
- Configuration settings

### Manual Testing

1. **Login**: Log into the application
2. **Wait**: Leave the application idle for over 1 hour
3. **Interact**: Try to perform any action requiring authentication
4. **Verify**: Confirm automatic logout and notification

## Security Considerations

### Best Practices Implemented

1. **Secure Session Storage**: Sessions stored in PostgreSQL database
2. **Encrypted Cookies**: Session cookies are encrypted using SESSION_SECRET
3. **HTTP-Only Cookies**: Prevents client-side JavaScript access
4. **Secure Transmission**: HTTPS-only cookies in production
5. **CSRF Protection**: SameSite cookie attribute

### Additional Recommendations

1. **Regular Secret Rotation**: Rotate SESSION_SECRET periodically
2. **Monitor Session Activity**: Log session creation and expiration events
3. **User Education**: Inform users about automatic logout policy
4. **Adjustable Timeouts**: Consider making timeout configurable per user role

## Troubleshooting

### Common Issues

1. **Premature Logout**: Check system clock synchronization
2. **Session Not Expiring**: Verify maxAge configuration
3. **Cookie Issues**: Ensure proper HTTPS setup in production

### Debug Commands

```bash
# Check active sessions
npx tsx scripts/test-session-timeout.ts

# Monitor session table
psql -d your_database -c "SELECT sid, expire FROM session ORDER BY expire DESC LIMIT 10;"
```

## Compliance

This implementation helps meet security compliance requirements:

- **OWASP**: Session Management best practices
- **GDPR**: Data protection through automatic session cleanup
- **SOC 2**: Access control and session security
- **PCI DSS**: Secure session handling for payment systems

## Conclusion

The automatic session timeout feature significantly enhances the security posture of SkyPANEL by:

- Reducing the risk of unauthorized access
- Implementing industry-standard session security practices
- Providing