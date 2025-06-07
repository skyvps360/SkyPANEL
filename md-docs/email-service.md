# Email Service

## Overview
The Email Service in SkyPANEL handles all outbound email communications, including transactional emails, notifications, and system alerts. It supports multiple email providers and includes features like queue management, template rendering, and delivery tracking.

## Table of Contents
- [Features](#features)
- [Architecture](#architecture)
- [Configuration](#configuration)
- [Templates](#templates)
- [Queue System](#queue-system)
- [Providers](#providers)
- [Error Handling](#error-handling)
- [Security](#security)
- [Monitoring](#monitoring)
- [Best Practices](#best-practices)

## Features

### Core Functionality
- **Templated Emails**: Support for dynamic email templates
- **Queue System**: Asynchronous email processing
- **Multiple Providers**: Fallback between different email services
- **Delivery Tracking**: Monitor email delivery status
- **Rate Limiting**: Prevent email sending abuse
- **Bulk Sending**: Efficiently send to multiple recipients

### Email Types
1. **User Account**
   - Welcome emails
   - Email verification
   - Password reset
   - Account activity alerts

2. **Billing**
   - Invoice notifications
   - Payment receipts
   - Subscription updates
   - Payment failures

3. **System**
   - Admin alerts
   - Error notifications
   - Security events
   - Maintenance notices

## Architecture

### Components
- **EmailService**: Main service class
- **EmailQueue**: Manages the sending queue
- **TemplateEngine**: Renders email templates
- **Providers**: Email service integrations
- **WebhookHandler**: Processes delivery events

### Data Flow
1. Application requests email send
2. Email is added to the queue
3. Queue processor picks up the email
4. Template is rendered with provided data
5. Email is sent through selected provider
6. Delivery status is updated

## Configuration

### Environment Variables
```env
# Email Configuration
EMAIL_PROVIDER=sendgrid
EMAIL_FROM=noreply@skyvps360.xyz
EMAIL_FROM_NAME="SkyPANEL"
EMAIL_REPLY_TO=support@skyvps360.xyz

# SendGrid
SENDGRID_API_KEY=your_sendgrid_key

# SMTP
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user@example.com
SMTP_PASS=your_password
SMTP_SECURE=true

# Queue
EMAIL_QUEUE_CONCURRENCY=5
EMAIL_RATE_LIMIT=1000
```

### Provider Configuration
```typescript
interface EmailProviderConfig {
  provider: 'sendgrid' | 'smtp' | 'mailgun' | 'ses';
  apiKey?: string;
  host?: string;
  port?: number;
  user?: string;
  pass?: string;
  secure?: boolean;
  region?: string;
}
```

## Templates

### Template Structure
```
emails/
  ├── layouts/
  │   └── default.html
  └── welcome/
      ├── subject.ejs
      ├── text.ejs
      └── html.ejs
```

### Example Template (EJS)
```html
<%- include('../layouts/header') %>

<h1>Welcome to SkyPANEL, <%= user.firstName %>!</h1>
<p>Your account has been successfully created.</p>

<%- include('../layouts/footer') %>
```

### Template Variables
- **User Data**: user.* (name, email, etc.)
- **System Data**: appName, baseUrl, currentYear
- **Custom Data**: Any additional data passed to the template

## Queue System

### Queue Configuration
- **Concurrency**: Number of emails sent in parallel
- **Retry Logic**: Automatic retry for failed sends
- **Priority**: High-priority emails sent first
- **Rate Limiting**: Prevents hitting provider limits

### Queue Management
```typescript
interface EmailQueueItem {
  id: string;
  to: string | string[];
  subject: string;
  template: string;
  data: Record<string, any>;
  priority: 'high' | 'normal' | 'low';
  status: 'pending' | 'sending' | 'sent' | 'failed';
  retryCount: number;
  lastAttempt?: Date;
  error?: string;
  metadata?: Record<string, any>;
}
```

## Providers

### Supported Providers
1. **SendGrid**
   - High deliverability
   - Advanced analytics
   - Webhook support

2. **SMTP**
   - Self-hosted option
   - Works with any SMTP server
   - Good for testing

3. **Mailgun**
   - Transactional email focus
   - Good deliverability
   - Detailed logs

4. **Amazon SES**
   - Cost-effective at scale
   - High reliability
   - Good for AWS users

### Provider Selection
1. Try primary provider (e.g., SendGrid)
2. If failed, try fallback provider (e.g., SMTP)
3. Log failures for retry
4. Update delivery status

## Error Handling

### Error Types
1. **Validation Errors**
   - Invalid email address
   - Missing required fields
   - Template not found

2. **Provider Errors**
   - Authentication failures
   - Rate limiting
   - Service outages

3. **Delivery Failures**
   - Bounced emails
   - Spam complaints
   - Blocked emails

### Retry Logic
- Immediate retry for temporary failures
- Exponential backoff for rate limits
- Maximum 3 retries
- Dead letter queue for persistent failures

## Security

### Data Protection
- No sensitive data in templates
- HTML escaping by default
- Secure cookie settings for tracking
- Encryption of sensitive provider credentials

### Rate Limiting
- Per-recipient limits
- Global sending limits
- IP-based rate limiting
- Account-based restrictions

## Monitoring

### Metrics
- Emails sent/failed
- Delivery rates
- Open/click rates
- Bounce/complaint rates
- Queue length and processing time

### Alerts
- Failed email threshold
- Queue backlog
- Provider errors
- Rate limit warnings

## Best Practices

### Development
1. Use templates for all emails
2. Test with real email addresses
3. Implement proper error handling
4. Monitor delivery metrics
5. Keep templates responsive

### Operations
1. Monitor queue health
2. Set up alerts for failures
3. Regularly review bounce rates
4. Update SPF/DKIM/DMARC records
5. Maintain IP reputation

## Troubleshooting

### Common Issues
1. **Emails Not Sending**
   - Check provider credentials
   - Verify network connectivity
   - Check rate limits
   - Review error logs

2. **Emails Marked as Spam**
   - Verify SPF/DKIM/DMARC
   - Check content for spam triggers
   - Monitor blacklists
   - Warm up IPs if needed

3. **Template Rendering Issues**
   - Check template syntax
   - Verify all variables are passed
   - Test with different data
   - Check for HTML validation errors

## Support
For additional help with the email service, contact the infrastructure team or refer to the provider's documentation.
