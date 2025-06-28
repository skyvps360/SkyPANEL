# Discord Bot Service

## Overview
The Discord Bot Service is a core component of SkyPANEL that provides seamless integration between Discord and the platform. It enables community engagement, support ticket management, and real-time notifications.

## Table of Contents
- [Core Features](#core-features)
- [Architecture](#architecture)
- [Command Reference](#command-reference)
- [Ticket System](#ticket-system)
- [Moderation Features](#moderation-features)
- [AI Integration](#ai-integration)
- [Todo Management](#todo-management)
- [Server Monitoring](#server-monitoring)
- [Configuration](#configuration)
- [Error Handling](#error-handling)

## Core Features

### 1. Ticket System
- Thread-based support tickets
- Ticket categorization
- Staff assignment
- Transcript generation
- Auto-close on inactivity

### 2. Moderation Tools
- User management (kick, ban, timeout)
- Message moderation
- Role management
- Audit logging

### 3. AI Integration
- Gemini AI-powered chat
- Context-aware responses
- Support knowledge base
- Natural language processing

### 4. Todo Management
- Personal and team todo lists
- Task assignment
- Due dates and priorities
- Progress tracking

### 5. Server Monitoring
- Status checks for services
- Resource usage monitoring
- Incident notifications
- Maintenance scheduling

## Architecture

### Components
- **DiscordBotService**: Main service class (Singleton)
- **Command Handlers**: Process slash commands
- **Event Listeners**: Handle Discord events
- **State Management**: Track conversations and user sessions
- **API Clients**: Integrate with external services

### Data Flow
1. User interacts with slash command or bot mention
2. Discord dispatches interaction event
3. Bot service routes to appropriate handler
4. Handler processes request and interacts with services
5. Response sent back to Discord

## Command Reference

### Moderation Commands
- `/kick [user] [reason]` - Remove a user from the server
- `/ban [user] [reason]` - Ban a user from the server
- `/timeout [user] [duration] [reason]` - Timeout a user
- `/warn [user] [reason]` - Issue a warning

### Ticket Commands
- `/ticket create [category]` - Create a new support ticket
- `/ticket close [reason]` - Close the current ticket
- `/ticket add [user]` - Add user to ticket
- `/ticket remove [user]` - Remove user from ticket

### Todo Commands
- `/todo add [task]` - Add a new task
- `/todo list` - Show your tasks
- `/todo complete [id]` - Mark task as complete
- `/todo delete [id]` - Remove a task

### AI Commands
- `/ask [question]` - Ask the AI a question
- `/support [issue]` - Get help with an issue
- `/docs [search]` - Search the documentation

## Ticket System

### Ticket Creation
1. User runs `/ticket create [category]`
2. Bot creates a private thread
3. Staff are notified and can join
4. Conversation happens in the thread

### Ticket Management
- Auto-close after 24h of inactivity
- Transcript generation on close
- Staff can add/remove participants
- Ticket categories for organization

### Transcripts
- Full conversation history
- Includes timestamps and authors
- Formatted as HTML/PDF
- Stored for record-keeping

## Moderation Features

### User Management
- View user information
- Track warnings and infractions
- Temporary and permanent actions
- Appeal process support

### Message Moderation
- Delete inappropriate messages
- Bulk message cleanup
- Filter configuration
- Logging of all actions

## AI Integration

### Gemini AI
- Natural language understanding
- Context-aware responses
- Support knowledge base
- Learning from interactions

### Features
- Multi-turn conversations
- Code formatting
- Rich embeds
- Rate limiting

## Todo Management

### Personal Tasks
- Simple task tracking
- Due dates and priorities
- Categories and tags
- Progress tracking

### Team Tasks
- Task assignment
- Shared task lists
- Progress updates
- Notifications

## Server Monitoring

### Status Checks
- Service health monitoring
- Uptime tracking
- Performance metrics
- Alerting

### Notifications
- Real-time status updates
- Maintenance announcements
- Incident reports
- Status page integration

## Configuration

### Environment Variables
```env
DISCORD_BOT_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_client_id
DISCORD_GUILD_ID=your_guild_id
AI_API_KEY=your_ai_key
```

### Permissions
- Bot requires specific Discord intents
- Role-based access control
- Channel restrictions
- Command permissions

## Error Handling

### Error Types
1. **User Errors**
   - Invalid input
   - Missing permissions
   - Rate limiting

2. **System Errors**
   - API failures
   - Network issues
   - Service outages

### Logging
- Structured logging
- Error tracking
- Performance metrics
- Audit trails

## Best Practices

### Development
- Use TypeScript types
- Handle all errors
- Document new features
- Write tests

### Operations
- Monitor bot health
- Regular backups
- Security reviews
- Update dependencies

## Troubleshooting

### Common Issues
1. **Bot not responding**
   - Check bot status
   - Verify permissions
   - Review logs

2. **Command not found**
   - Sync commands
   - Check permissions
   - Verify deployment

3. **API errors**
   - Check API status
   - Verify credentials
   - Review rate limits

## Support
For additional help, contact the development team or refer to the project documentation.
