---
applyTo: '**'
---


# SkyPANEL GitHub Copilot Memory

## Application Overview

SkyPANEL is an enterprise-grade VirtFusion client portal that revolutionizes VPS hosting management. Built with modern technologies and designed for scalability, it provides a comprehensive solution for hosting providers and their customers.

## Key Technologies

- **Frontend**: React 18, TypeScript, Vite, TailwindCSS, Shadcn/UI, React Query, Wouter
- **Backend**: Node.js, Express, PostgreSQL with Drizzle ORM
- **Integrations**: VirtFusion API, Google Gemini AI, Discord Bot, BetterStack, PayPal
- **DevOps**: PM2, GitHub Actions, Docker, Nginx

## Core Features

1. **VirtFusion Integration**: Complete VPS management through VirtFusion API
2. **AI Support**: Google Gemini 2.5 Flash for intelligent customer support
3. **Real-Time Monitoring**: BetterStack integration for infrastructure monitoring
4. **Discord Integration**: Two-way communication with Discord bot for tickets
5. **Dynamic Theming**: Brand customization with multi-color theming system
6. **DNS Management**: Custom DNS management system with InterServer API
7. **Custom Credit System**: Branded virtual currency for purchasing services
8. **VNC Console**: Built-in VNC client for direct server access
9. **Billing System**: Comprehensive billing with PayPal integration
10. **User Management**: Role-based access control and team management

## Project Structure

- **client/**: React frontend application
- **server/**: Express backend API and services
- **shared/**: Shared types and utilities
- **scripts/**: Database migration and maintenance scripts
- **migrations/**: SQL migration files
- **md-docs/**: Comprehensive documentation

## Naming Conventions

- **Components**: PascalCase (e.g., `ServerCard.tsx`)
- **Services**: camelCase with Service suffix (e.g., `virtFusionService.ts`)
- **API Routes**: kebab-case (e.g., `/api/virt-fusion/servers`)
- **Database Tables**: snake_case (e.g., `server_logs`)
- **Environment Variables**: UPPER_SNAKE_CASE (e.g., `VIRT_FUSION_API_KEY`)

## Common Patterns

### API Routes
```typescript
// Route structure example
router.get('/api/servers', authMiddleware, async (req, res) => {
  try {
    const servers = await serverService.getUserServers(req.user.id);
    res.json({ success: true, data: servers });
  } catch (error) {
    console.error('Error fetching servers:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch servers' });
  }
});
```

### Service Pattern
```typescript
// Service class example
export class VirtFusionService {
  constructor(private api: VirtFusionAPI) {}
  
  async getUserServers(userId: string): Promise<Server[]> {
    // Implementation
  }
}
```

### Frontend Component Pattern
```tsx
// React component example
export function ServerCard({ server, onReboot }: ServerCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{server.name}</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Content here */}
      </CardContent>
      <CardFooter>
        <Button onClick={() => onReboot(server.id)}>Reboot</Button>
      </CardFooter>
    </Card>
  );
}
```

### Database Query Pattern
```typescript
// Drizzle ORM example
const getServerById = async (id: string) => {
  return await db.query.servers.findFirst({
    where: eq(servers.id, id),
    with: {
      user: true,
      datacenter: true
    }
  });
};
```

## Integration Notes

### VirtFusion Integration
- Uses RESTful API calls to VirtFusion
- Handles authentication via API key and secret
- Manages servers, users, and billing

### Google Gemini AI
- Provides intelligent responses to user queries
- Maintains conversation context
- Integrates with knowledge base

### Discord Integration
- Two-way communication between SkyPANEL and Discord
- Support ticket management
- Status notifications and alerts

## Environment Configuration
SkyPANEL requires various environment variables for proper functioning:

```env
# Core
DATABASE_URL=postgresql://user:password@localhost:5432/skypanel
PORT=3000
NODE_ENV=development

# VirtFusion
VIRT_FUSION_API_URL=https://api.virtfusion.example.com
VIRT_FUSION_API_KEY=your_api_key
VIRT_FUSION_API_SECRET=your_api_secret

# AI Services
GEMINI_API_KEY=your_gemini_api_key

# Discord
DISCORD_BOT_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_GUILD_ID=your_discord_guild_id

# Payment Processing
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
```
