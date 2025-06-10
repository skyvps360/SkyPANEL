````# SkyPANEL Development Guidelines

This document provides essential information for developers working on the SkyPANEL project. It includes build/configuration instructions, testing information, and additional development guidelines.

## Build/Configuration Instructions

### Environment Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/skyvps360/SkyPANEL.git
   cd SkyPANEL
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create a `.env` file** with the following variables:
   ```bash
   # Database Configuration
   DATABASE_URL=postgres://username:password@hostname:port/database

   # Session Management
   SESSION_SECRET=your_secure_random_string_here

   # VirtFusion API Integration
   VIRTFUSION_API_URL=https://your-virtfusion.com/api/v1
   VIRTFUSION_API_KEY=your_virtfusion_api_key

   # Email Configuration (SMTP2GO)
   SMTP2GO_API_KEY=your_smtp2go_api_key
   SMTP_FROM=noreply@your-domain.com
   SMTP_FROM_NAME=Your Company Support

   # Discord Integration (Optional)
   DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/your-webhook-url
   DISCORD_ROLE_ID=your_discord_role_id

   # Discord Bot Integration (Optional)
   DISCORD_BOT_TOKEN=your_discord_bot_token
   DISCORD_GUILD_ID=your_discord_server_id
   DISCORD_CHANNEL_ID=your_discord_channel_id
   DISCORD_ALLOWED_ROLE_IDS=role_id_1,role_id_2
   DISCORD_ALLOWED_USER_IDS=user_id_1,user_id_2

   # Google AI Integration
   GOOGLE_AI_API_KEY=your_google_gemini_api_key
   GEMINI_API_KEY=your_google_gemini_api_key

   # BetterStack Monitoring (Optional)
   BETTERSTACK_API_KEY=your_betterstack_api_key

   # PayPal Configuration
   VITE_PAYPAL_SANDBOX=true_or_false
   VITE_PAYPAL_SANDBOX_CLIENT_ID=your_paypal_sandbox_client_id
   VITE_PAYPAL_SANDBOX_SECRET=your_paypal_sandbox_secret
   VITE_PAYPAL_CLIENT_ID=your_paypal_live_client_id
   VITE_PAYPAL_SECRET=your_paypal_live_secret
   VITE_PAYPAL_CURRENCY=USD

   # Application Settings
   PORT=3000
   NODE_ENV=development
   ```

4. **Initialize the database**:
   ```bash
   npm run db:push
   ```

5. **Create an admin user**:
   ```bash
   npx tsx scripts/create-admin-user.ts
   ```

### Development

1. **Start the development server**:
   ```bash
   npm run dev
   ```

2. **Build for production**:
   ```bash
   npm run build
   ```

3. **Start the production server**:
   ```bash
   npm run start
   ```

### PM2 Process Management

The project includes PM2 configuration for production deployment:

```bash
# Start with PM2
npm run start:pm2

# Stop the PM2 process
npm run stop:pm2

# Restart the PM2 process
npm run restart:pm2

# View PM2 logs
npm run logs:pm2
```

## Testing Information

### Testing Framework

The project uses Vitest for testing. The testing configuration is defined in `vitest.config.ts`.

### Running Tests

```bash
# Run tests once
npm test

# Run tests in watch mode (useful during development)
npm run test:watch
```

### Adding New Tests

1. **Create test files** in the `tests` directory with the `.test.ts` extension.
2. **Follow the existing test patterns** using the Vitest API:

```typescript
import { describe, it, expect } from 'vitest';
import { functionToTest } from '../path/to/function';

describe('Component or Function Name', () => {
  it('should do something specific', () => {
    // Arrange
    const input = 'some input';
    
    // Act
    const result = functionToTest(input);
    
    // Assert
    expect(result).toBe('expected output');
  });
});
```

### Example Test

Here's an example test for the `isDefaultInterServerRecord` function from `shared/dns-record-utils.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { isDefaultInterServerRecord, DnsRecord } from '../shared/dns-record-utils';

describe('DNS Record Utils', () => {
  const domainName = 'example.com';

  describe('isDefaultInterServerRecord', () => {
    it('should identify SOA records as default', () => {
      const record: DnsRecord = {
        id: '1',
        name: 'example.com',
        type: 'SOA',
        content: 'ns1.example.com admin.example.com 2023010101 10800 3600 604800 3600',
        ttl: '3600',
        prio: '0',
        disabled: '0'
      };
      
      expect(isDefaultInterServerRecord(record, domainName)).toBe(true);
    });
    
    // Additional tests...
  });
});
```

## Additional Development Information

### Project Structure

- **client**: Frontend React application
  - **src**: Source code for the frontend
    - **components**: Reusable UI components
    - **pages**: Page components
    - **lib**: Utility functions and hooks
- **server**: Backend Express application
  - **routes**: API route handlers
  - **services**: Business logic
  - **middleware**: Express middleware
- **shared**: Code shared between frontend and backend
- **scripts**: Utility scripts for development and deployment
- **migrations**: Database migration scripts
- **tests**: Test files

### Path Aliases

The project uses path aliases for cleaner imports:

- `@`: Points to `client/src`
- `@shared`: Points to `shared`

### Build Process

The project uses:
- **Vite** for frontend building
- **esbuild** for backend building
- **TypeScript** for type checking

### Database

The project uses:
- **PostgreSQL** as the database
- **Drizzle ORM** for database access
- **Drizzle Kit** for schema migrations

### API Structure

The API follows RESTful principles with consistent error handling:

- **HTTP Status Codes**:
  - `200` - Success
  - `400` - Bad Request (validation errors)
  - `401` - Unauthorized (authentication required)
  - `403` - Forbidden (insufficient permissions)
  - `404` - Not Found
  - `429` - Too Many Requests (rate limited)
  - `500` - Internal Server Error

- **Error Response Format**:
  ```json
  {
    "error": {
      "code": "error_code",
      "message": "Human-readable error message"
    }
  }
  ```

### Health Checks

The project includes health check endpoints:

```bash
# Check system health
curl http://localhost:3000/api/health

# Verify database connectivity
curl http://localhost:3000/api/db-health

# Test VirtFusion integration
curl http://localhost:3000/api/virtfusion-health
```

### Monitoring and Debugging

```bash
# View application logs
npm run logs

# Check error logs
tail -f logs/error.log

# Monitor API performance
grep "slow query" logs/app.log
```````