# Chat System Documentation

## Overview

The SkyPANEL Chat System provides real-time communication between users and support staff, with AI assistance via Google Gemini. It includes department management, message handling, typing indicators, and session management.

## Features

- **Departments**: Categorized support channels
- **Sessions**: Managed chat conversations
- **Messages**: Text-based communication with metadata
- **AI Integration**: Automated responses using Gemini AI
- **Admin Management**: Department admins and permissions
- **Typing Indicators**: Real-time typing status
- **Ticket Conversion**: Convert chats to support tickets

## Database Schema

### Chat Departments
```sql
CREATE TABLE \"chat_departments\" (
  \"id\" serial PRIMARY KEY NOT NULL,
  \"name\" text NOT NULL,
  \"description\" text,
  \"is_default\" boolean DEFAULT false,
  \"is_active\" boolean DEFAULT true,
  \"display_order\" integer DEFAULT 0,
  \"color\" text DEFAULT '#3b82f6',
  \"icon\" text DEFAULT 'MessageCircle',
  \"created_at\" timestamp DEFAULT now() NOT NULL,
  \"updated_at\" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT \"chat_departments_name_unique\" UNIQUE(\"name\")
);
```

### Chat Sessions
```sql
CREATE TABLE \"chat_sessions\" (
  \"id\" serial PRIMARY KEY NOT NULL,
  \"user_id\" integer NOT NULL,
  \"assigned_admin_id\" integer,
  \"department_id\" integer,
  \"status\" text DEFAULT 'waiting' NOT NULL,
  \"priority\" text DEFAULT 'normal' NOT NULL,
  \"subject\" text,
  \"department\" text DEFAULT 'general',
  \"converted_to_ticket_id\" integer,
  \"converted_at\" timestamp,
  \"converted_by_admin_id\" integer,
  \"metadata\" json DEFAULT '{}'::json,
  \"started_at\" timestamp DEFAULT now() NOT NULL,
  \"ended_at\" timestamp,
  \"last_activity_at\" timestamp DEFAULT now() NOT NULL,
  \"created_at\" timestamp DEFAULT now() NOT NULL,
  \"updated_at\" timestamp DEFAULT now() NOT NULL
);
```

### Chat Messages
```sql
CREATE TABLE \"chat_messages\" (
  \"id\" serial PRIMARY KEY NOT NULL,
  \"session_id\" integer NOT NULL,
  \"user_id\" integer NOT NULL,
  \"message\" text NOT NULL,
  \"message_type\" text DEFAULT 'text' NOT NULL,
  \"is_from_admin\" boolean DEFAULT false NOT NULL,
  \"read_at\" timestamp,
  \"metadata\" json DEFAULT '{}'::json,
  \"created_at\" timestamp DEFAULT now() NOT NULL
);
```

### Department Admins
```sql
CREATE TABLE \"chat_department_admins\" (
  \"id\" serial PRIMARY KEY NOT NULL,
  \"department_id\" integer NOT NULL,
  \"admin_id\" integer NOT NULL,
  \"can_manage\" boolean DEFAULT false,
  \"is_active\" boolean DEFAULT true,
  \"created_at\" timestamp DEFAULT now() NOT NULL,
  \"updated_at\" timestamp DEFAULT now() NOT NULL
);
```

### Typing Indicators
```sql
CREATE TABLE \"chat_typing_indicators\" (
  \"id\" serial PRIMARY KEY NOT NULL,
  \"session_id\" integer NOT NULL,
  \"user_id\" integer NOT NULL,
  \"is_typing\" boolean DEFAULT false NOT NULL,
  \"last_typed_at\" timestamp DEFAULT now() NOT NULL
);
```

## AI Integration

The GeminiService handles AI responses:

- Generates responses with company context
- Uses conversation history
- Formats responses as \"SkyAI\"
- Rate limited to 15 RPM

Key Method:
```typescript
async generateChatResponse(
  question: string,
  username: string,
  conversationHistory: Array<{role: string, parts: Array<{text: string}>}>,
  req?: Request,
  res?: Response
): Promise<{ success: boolean; response: string }>
```

## Implementation

### Backend
- **GeminiService**: Handles AI chat responses
- **Discord AI Service**: Integrates chat with Discord
- Routes for sessions, messages, departments

### Frontend
- Chat components in client/src/components/chat/
- Real-time updates using React Query
- Department selection
- Message list and form

## Usage

1. User starts chat session
2. Select department
3. AI provides initial response
4. Messages exchanged
5. Admin can join/convert to ticket

For AI specifics, see gemini-ai-service.md"