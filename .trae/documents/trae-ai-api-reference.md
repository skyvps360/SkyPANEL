# Trae AI API Reference

## 1. API Overview

### 1.1 Base Information
- **Base URL**: `https://api.trae.ai/v1`
- **Protocol**: HTTPS only
- **Authentication**: Bearer Token (JWT)
- **Content-Type**: `application/json`
- **API Version**: v1.0

### 1.2 Authentication
All API requests require authentication using a Bearer token in the Authorization header:

```http
Authorization: Bearer <your_api_token>
```

### 1.3 Rate Limiting
- **Standard Plan**: 1,000 requests per hour
- **Premium Plan**: 10,000 requests per hour
- **Enterprise Plan**: Unlimited

### 1.4 Response Format
All responses follow a consistent JSON structure:

```json
{
  "success": true,
  "data": {},
  "message": "Operation completed successfully",
  "timestamp": "2024-01-15T10:30:00Z",
  "request_id": "req_123456789"
}
```

## 2. Authentication Endpoints

### 2.1 Generate API Token

**Endpoint**: `POST /auth/token`

**Description**: Generate a new API token for authentication.

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "your_password",
  "expires_in": 3600
}
```

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| email | string | Yes | User email address |
| password | string | Yes | User password |
| expires_in | integer | No | Token expiration in seconds (default: 3600) |

**Response**:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_at": "2024-01-15T11:30:00Z",
    "token_type": "Bearer"
  },
  "message": "Token generated successfully"
}
```

### 2.2 Refresh Token

**Endpoint**: `POST /auth/refresh`

**Description**: Refresh an existing API token.

**Request Body**:
```json
{
  "refresh_token": "refresh_token_here"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "token": "new_access_token",
    "expires_at": "2024-01-15T12:30:00Z"
  }
}
```

## 3. AI Conversation Endpoints

### 3.1 Create Conversation

**Endpoint**: `POST /conversations`

**Description**: Start a new AI conversation session.

**Request Body**:
```json
{
  "title": "Project Planning Discussion",
  "model": "gpt-4",
  "system_prompt": "You are a helpful project management assistant.",
  "settings": {
    "temperature": 0.7,
    "max_tokens": 2048
  }
}
```

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| title | string | No | Conversation title |
| model | string | No | AI model to use (default: gpt-4) |
| system_prompt | string | No | System prompt for the conversation |
| settings | object | No | Model-specific settings |

**Response**:
```json
{
  "success": true,
  "data": {
    "conversation_id": "conv_123456789",
    "title": "Project Planning Discussion",
    "model": "gpt-4",
    "created_at": "2024-01-15T10:30:00Z",
    "status": "active"
  }
}
```

### 3.2 Send Message

**Endpoint**: `POST /conversations/{conversation_id}/messages`

**Description**: Send a message to an existing conversation.

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| conversation_id | string | Yes | Unique conversation identifier |

**Request Body**:
```json
{
  "message": "Can you help me create a project timeline?",
  "attachments": [
    {
      "type": "file",
      "url": "https://example.com/document.pdf",
      "name": "requirements.pdf"
    }
  ],
  "tools": ["file_analyzer", "calendar_integration"]
}
```

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| message | string | Yes | User message content |
| attachments | array | No | File attachments |
| tools | array | No | Tools to enable for this message |

**Response**:
```json
{
  "success": true,
  "data": {
    "message_id": "msg_123456789",
    "response": "I'd be happy to help you create a project timeline...",
    "tokens_used": 150,
    "processing_time": 1.2,
    "tools_used": ["file_analyzer"],
    "attachments_processed": 1
  }
}
```

### 3.3 Get Conversation History

**Endpoint**: `GET /conversations/{conversation_id}/messages`

**Description**: Retrieve message history for a conversation.

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| limit | integer | No | Number of messages to return (default: 50) |
| offset | integer | No | Number of messages to skip (default: 0) |
| order | string | No | Sort order: 'asc' or 'desc' (default: 'desc') |

**Response**:
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "message_id": "msg_123456789",
        "role": "user",
        "content": "Can you help me create a project timeline?",
        "timestamp": "2024-01-15T10:30:00Z",
        "attachments": []
      },
      {
        "message_id": "msg_123456790",
        "role": "assistant",
        "content": "I'd be happy to help you create a project timeline...",
        "timestamp": "2024-01-15T10:30:05Z",
        "tools_used": ["file_analyzer"]
      }
    ],
    "total_count": 2,
    "has_more": false
  }
}
```

## 4. Tool Integration Endpoints

### 4.1 List Available Tools

**Endpoint**: `GET /tools`

**Description**: Get a list of all available tools and their capabilities.

**Response**:
```json
{
  "success": true,
  "data": {
    "tools": [
      {
        "tool_id": "file_analyzer",
        "name": "File Analyzer",
        "description": "Analyze and extract information from various file formats",
        "supported_formats": ["pdf", "docx", "xlsx", "csv"],
        "max_file_size": "10MB",
        "status": "active"
      },
      {
        "tool_id": "web_search",
        "name": "Web Search",
        "description": "Search the internet for current information",
        "rate_limit": "100 searches per hour",
        "status": "active"
      }
    ]
  }
}
```

### 4.2 Execute Tool

**Endpoint**: `POST /tools/{tool_id}/execute`

**Description**: Execute a specific tool with provided parameters.

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| tool_id | string | Yes | Unique tool identifier |

**Request Body**:
```json
{
  "parameters": {
    "query": "latest AI developments 2024",
    "max_results": 10,
    "language": "en"
  },
  "context": {
    "conversation_id": "conv_123456789",
    "user_preferences": {}
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "execution_id": "exec_123456789",
    "result": {
      "search_results": [
        {
          "title": "Latest AI Developments in 2024",
          "url": "https://example.com/ai-2024",
          "snippet": "Recent breakthroughs in artificial intelligence..."
        }
      ]
    },
    "execution_time": 2.1,
    "tokens_consumed": 0
  }
}
```

## 5. File Management Endpoints

### 5.1 Upload File

**Endpoint**: `POST /files/upload`

**Description**: Upload a file for processing by AI or tools.

**Request**: Multipart form data

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| file | file | Yes | File to upload |
| purpose | string | No | Purpose: 'analysis', 'reference', 'training' |
| metadata | string | No | JSON string with additional metadata |

**Response**:
```json
{
  "success": true,
  "data": {
    "file_id": "file_123456789",
    "filename": "document.pdf",
    "size": 1048576,
    "mime_type": "application/pdf",
    "upload_url": "https://storage.trae.ai/files/file_123456789",
    "expires_at": "2024-01-22T10:30:00Z"
  }
}
```

### 5.2 Get File Information

**Endpoint**: `GET /files/{file_id}`

**Description**: Retrieve information about an uploaded file.

**Response**:
```json
{
  "success": true,
  "data": {
    "file_id": "file_123456789",
    "filename": "document.pdf",
    "size": 1048576,
    "mime_type": "application/pdf",
    "status": "processed",
    "analysis_results": {
      "page_count": 10,
      "word_count": 2500,
      "language": "en"
    },
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

## 6. Analytics Endpoints

### 6.1 Get Usage Statistics

**Endpoint**: `GET /analytics/usage`

**Description**: Retrieve usage statistics for your account.

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| start_date | string | No | Start date (ISO 8601 format) |
| end_date | string | No | End date (ISO 8601 format) |
| granularity | string | No | 'hour', 'day', 'week', 'month' |

**Response**:
```json
{
  "success": true,
  "data": {
    "period": {
      "start": "2024-01-01T00:00:00Z",
      "end": "2024-01-15T23:59:59Z"
    },
    "metrics": {
      "total_requests": 1250,
      "total_tokens": 125000,
      "conversations": 45,
      "tools_used": 78,
      "files_processed": 12
    },
    "daily_breakdown": [
      {
        "date": "2024-01-15",
        "requests": 85,
        "tokens": 8500,
        "conversations": 3
      }
    ]
  }
}
```

## 7. Error Handling

### 7.1 Error Response Format
All error responses follow this structure:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "The request is missing required parameters",
    "details": {
      "missing_fields": ["message"]
    }
  },
  "request_id": "req_123456789"
}
```

### 7.2 HTTP Status Codes
| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 429 | Rate Limit Exceeded |
| 500 | Internal Server Error |
| 503 | Service Unavailable |

### 7.3 Common Error Codes
| Error Code | Description |
|------------|-------------|
| INVALID_REQUEST | Request format or parameters are invalid |
| UNAUTHORIZED | Authentication token is missing or invalid |
| RATE_LIMIT_EXCEEDED | API rate limit has been exceeded |
| INSUFFICIENT_CREDITS | Account has insufficient credits |
| MODEL_UNAVAILABLE | Requested AI model is not available |
| FILE_TOO_LARGE | Uploaded file exceeds size limit |
| TOOL_ERROR | Error occurred during tool execution |

## 8. SDKs and Libraries

### 8.1 Official SDKs
- **Python**: `pip install trae-ai-python`
- **JavaScript/Node.js**: `npm install trae-ai-js`
- **Go**: `go get github.com/trae-ai/go-sdk`
- **Java**: Maven/Gradle dependency available

### 8.2 Python SDK Example
```python
from trae_ai import TraeAI

# Initialize client
client = TraeAI(api_key="your_api_key")

# Create conversation
conversation = client.conversations.create(
    title="My Conversation",
    model="gpt-4"
)

# Send message
response = client.conversations.send_message(
    conversation_id=conversation.id,
    message="Hello, how can you help me today?"
)

print(response.content)
```

### 8.3 JavaScript SDK Example
```javascript
import { TraeAI } from 'trae-ai-js';

// Initialize client
const client = new TraeAI({
  apiKey: 'your_api_key'
});

// Create conversation and send message
async function chatWithAI() {
  const conversation = await client.conversations.create({
    title: 'My Conversation',
    model: 'gpt-4'
  });
  
  const response = await client.conversations.sendMessage({
    conversationId: conversation.id,
    message: 'Hello, how can you help me today?'
  });
  
  console.log(response.content);
}
```

## 9. Webhooks

### 9.1 Webhook Configuration
**Endpoint**: `POST /webhooks`

**Description**: Configure webhook endpoints for real-time notifications.

**Request Body**:
```json
{
  "url": "https://your-app.com/webhooks/trae-ai",
  "events": ["conversation.completed", "tool.executed", "file.processed"],
  "secret": "your_webhook_secret"
}
```

### 9.2 Webhook Events
| Event | Description |
|-------|-------------|
| conversation.created | New conversation started |
| conversation.completed | Conversation ended |
| message.received | New message in conversation |
| tool.executed | Tool execution completed |
| file.processed | File processing completed |
| error.occurred | Error during processing |

### 9.3 Webhook Payload Example
```json
{
  "event": "conversation.completed",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "conversation_id": "conv_123456789",
    "message_count": 10,
    "total_tokens": 2500,
    "duration": 300
  }
}
```

This API reference provides comprehensive documentation for integrating with Trae AI. For additional examples and advanced usage patterns, please refer to the usage examples documentation.