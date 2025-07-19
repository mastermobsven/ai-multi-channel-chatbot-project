# API Documentation for AI Customer Support Platform

This document provides comprehensive documentation for all API endpoints available in the AI Customer Support Platform.

## Table of Contents

1. [Authentication](#authentication)
2. [Chatbot Core API](#chatbot-core-api)
3. [Memory Engine API](#memory-engine-api)
4. [Channel Integrations API](#channel-integrations-api)
5. [Admin API](#admin-api)
6. [WebSocket Protocol](#websocket-protocol)
7. [Error Handling](#error-handling)
8. [Rate Limiting](#rate-limiting)

## Authentication

### JWT Authentication

Most API endpoints require authentication using JSON Web Tokens (JWT).

**Request Header:**
```
Authorization: Bearer <jwt_token>
```

### API Key Authentication

Some endpoints support API key authentication for service-to-service communication.

**Request Header:**
```
X-API-Key: <api_key>
```

## Chatbot Core API

Base URL: `/api/core`

### Process Message

Process a new message through the AI chatbot.

**Endpoint:** `POST /messages`

**Request Body:**
```json
{
  "message": {
    "text": "Hello, I need help with my order",
    "type": "text",
    "id": "msg-1234567890"
  },
  "channel": "whatsapp",
  "userId": "user123",
  "sessionId": "session456",
  "metadata": {
    "language": "en",
    "timezone": "America/New_York"
  }
}
```

**Response:**
```json
{
  "response": {
    "text": "Hi there! I'd be happy to help with your order. Could you please provide your order number?",
    "id": "resp-0987654321",
    "type": "text"
  },
  "sessionId": "session456",
  "context": {
    "intent": "order_inquiry",
    "entities": ["order"],
    "confidence": 0.95
  }
}
```

### Process Audio Message

Process an audio message through transcription and AI chatbot.

**Endpoint:** `POST /messages/audio`

**Request Body:**
```json
{
  "audio": "base64EncodedAudioData...",
  "format": "mp3",
  "channel": "whatsapp",
  "userId": "user123",
  "sessionId": "session456",
  "metadata": {
    "language": "en",
    "timezone": "America/New_York"
  }
}
```

**Response:**
```json
{
  "transcription": "I need help with my recent order number 12345",
  "response": {
    "text": "I'll help you with your order #12345. Let me look that up for you.",
    "id": "resp-0987654321",
    "type": "text"
  },
  "sessionId": "session456",
  "context": {
    "intent": "order_status",
    "entities": ["order", "12345"],
    "confidence": 0.92
  }
}
```

### Get Session Context

Retrieve the current context for a session.

**Endpoint:** `GET /sessions/:sessionId/context`

**Response:**
```json
{
  "sessionId": "session456",
  "userId": "user123",
  "channel": "whatsapp",
  "context": {
    "conversation_history": [
      {
        "role": "user",
        "content": "Hello, I need help with my order"
      },
      {
        "role": "assistant",
        "content": "Hi there! I'd be happy to help with your order. Could you please provide your order number?"
      }
    ],
    "entities": {
      "order_number": null
    },
    "intent": "order_inquiry",
    "last_interaction": "2023-07-19T14:00:00.000Z"
  }
}
```

### Reset Session

Reset or clear a session's context.

**Endpoint:** `POST /sessions/:sessionId/reset`

**Response:**
```json
{
  "status": "success",
  "message": "Session context has been reset",
  "sessionId": "session456"
}
```

### Health Check

Check the health status of the Chatbot Core service.

**Endpoint:** `GET /health`

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "dependencies": {
    "openai": "healthy",
    "redis": "healthy",
    "memory_engine": "healthy"
  }
}
```

## Memory Engine API

Base URL: `/api/memory`

### Store Memory

Store a new memory or update an existing one.

**Endpoint:** `POST /memories`

**Request Body:**
```json
{
  "userId": "user123",
  "type": "long_term",
  "key": "order_preferences",
  "value": {
    "preferred_shipping": "express",
    "previous_orders": ["SKU123", "SKU456"]
  },
  "metadata": {
    "importance": 0.8,
    "source": "conversation"
  }
}
```

**Response:**
```json
{
  "id": "mem-1234567890",
  "status": "stored",
  "userId": "user123",
  "type": "long_term"
}
```

### Retrieve Memory

Retrieve memories for a user.

**Endpoint:** `GET /memories/:userId`

**Query Parameters:**
- `type`: Memory type (short_term, long_term)
- `key`: Specific memory key (optional)

**Response:**
```json
{
  "userId": "user123",
  "memories": [
    {
      "id": "mem-1234567890",
      "type": "long_term",
      "key": "order_preferences",
      "value": {
        "preferred_shipping": "express",
        "previous_orders": ["SKU123", "SKU456"]
      },
      "metadata": {
        "importance": 0.8,
        "source": "conversation",
        "created_at": "2023-07-18T10:30:00.000Z",
        "last_accessed": "2023-07-19T14:05:00.000Z"
      }
    }
  ]
}
```

### Search Knowledge Base

Search the knowledge base for relevant information.

**Endpoint:** `POST /knowledge/search`

**Request Body:**
```json
{
  "query": "How do I return an item?",
  "organizationId": "org123",
  "limit": 5
}
```

**Response:**
```json
{
  "results": [
    {
      "id": "kb-1234",
      "title": "Return Policy",
      "content": "To return an item, please visit our returns portal within 30 days of purchase...",
      "relevance": 0.92,
      "source": "knowledge_base",
      "url": "https://example.com/returns"
    },
    {
      "id": "kb-5678",
      "title": "Refund Process",
      "content": "Refunds are processed within 5-7 business days after we receive your return...",
      "relevance": 0.85,
      "source": "knowledge_base",
      "url": "https://example.com/refunds"
    }
  ]
}
```

### Store Vector Embedding

Store a vector embedding for future similarity search.

**Endpoint:** `POST /vectors`

**Request Body:**
```json
{
  "text": "Our return policy allows returns within 30 days of purchase with original receipt.",
  "metadata": {
    "title": "Return Policy",
    "source": "knowledge_base",
    "sourceId": "kb-1234",
    "organizationId": "org123"
  }
}
```

**Response:**
```json
{
  "id": "vec-1234567890",
  "status": "stored",
  "dimensions": 1536
}
```

### Health Check

Check the health status of the Memory Engine service.

**Endpoint:** `GET /health`

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "dependencies": {
    "chromadb": "healthy",
    "openai": "healthy"
  }
}
```

## Channel Integrations API

Base URL: `/api/channels`

### WhatsApp Webhook

Receive webhook events from WhatsApp.

**Endpoint:** `POST /whatsapp/webhook`

**Request Body:** WhatsApp Cloud API webhook payload

**Response:**
```json
{
  "status": "received"
}
```

### WhatsApp Webhook Verification

Verify the WhatsApp webhook URL.

**Endpoint:** `GET /whatsapp/webhook`

**Query Parameters:**
- `hub.mode`: Verification mode
- `hub.verify_token`: Verification token
- `hub.challenge`: Challenge string

**Response:** Challenge string (if verification successful)

### Send WhatsApp Message

Send a message via WhatsApp.

**Endpoint:** `POST /whatsapp/messages`

**Request Body:**
```json
{
  "to": "1234567890",
  "type": "text",
  "text": "Your order #12345 has been shipped!",
  "messageId": "msg-1234567890"
}
```

**Response:**
```json
{
  "status": "sent",
  "messageId": "whatsapp-msg-1234567890",
  "timestamp": "2023-07-19T14:30:00.000Z"
}
```

### Send Email

Send an email message.

**Endpoint:** `POST /email/send`

**Request Body:**
```json
{
  "to": "customer@example.com",
  "subject": "Your Support Request",
  "text": "Thank you for contacting us about your order #12345...",
  "html": "<p>Thank you for contacting us about your order #12345...</p>",
  "replyTo": "support@example.com",
  "threadId": "thread-1234567890"
}
```

**Response:**
```json
{
  "status": "sent",
  "messageId": "email-msg-1234567890",
  "timestamp": "2023-07-19T14:35:00.000Z"
}
```

### Process Email

Manually process an incoming email.

**Endpoint:** `POST /email/process`

**Request Body:**
```json
{
  "from": "customer@example.com",
  "subject": "Re: Your Support Request",
  "text": "Thanks for your help. My order number is #12345.",
  "html": "<p>Thanks for your help. My order number is #12345.</p>",
  "threadId": "thread-1234567890",
  "attachments": []
}
```

**Response:**
```json
{
  "status": "processed",
  "messageId": "msg-1234567890"
}
```

### Start Email Listener

Start the IMAP email listener service.

**Endpoint:** `POST /email/listener/start`

**Response:**
```json
{
  "status": "started",
  "message": "Email listener has been started"
}
```

### Stop Email Listener

Stop the IMAP email listener service.

**Endpoint:** `POST /email/listener/stop`

**Response:**
```json
{
  "status": "stopped",
  "message": "Email listener has been stopped"
}
```

### Health Check

Check the health status of the Channel Integrations service.

**Endpoint:** `GET /health`

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "dependencies": {
    "redis": "healthy",
    "chatbot_core": "healthy",
    "whatsapp": "healthy",
    "email": "healthy",
    "websocket": "healthy"
  }
}
```

## Admin API

Base URL: `/api/admin`

### User Management

#### List Users

**Endpoint:** `GET /users`

**Query Parameters:**
- `page`: Page number
- `limit`: Items per page
- `role`: Filter by role

**Response:**
```json
{
  "users": [
    {
      "id": "user-1234",
      "email": "admin@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "admin",
      "organizationId": "org-123",
      "isActive": true,
      "createdAt": "2023-06-01T10:00:00.000Z",
      "lastLoginAt": "2023-07-19T09:30:00.000Z"
    }
  ],
  "pagination": {
    "total": 25,
    "page": 1,
    "limit": 10,
    "pages": 3
  }
}
```

#### Create User

**Endpoint:** `POST /users`

**Request Body:**
```json
{
  "email": "agent@example.com",
  "password": "securePassword123",
  "firstName": "Jane",
  "lastName": "Smith",
  "role": "agent",
  "organizationId": "org-123"
}
```

**Response:**
```json
{
  "id": "user-5678",
  "email": "agent@example.com",
  "firstName": "Jane",
  "lastName": "Smith",
  "role": "agent",
  "organizationId": "org-123",
  "isActive": true,
  "createdAt": "2023-07-19T15:00:00.000Z"
}
```

### Session Management

#### List Active Sessions

**Endpoint:** `GET /sessions/active`

**Query Parameters:**
- `page`: Page number
- `limit`: Items per page
- `channel`: Filter by channel

**Response:**
```json
{
  "sessions": [
    {
      "id": "session-1234",
      "customerId": "cust-1234",
      "customerName": "Alice Johnson",
      "channel": "whatsapp",
      "status": "with_agent",
      "agentId": "user-5678",
      "agentName": "Jane Smith",
      "startedAt": "2023-07-19T14:30:00.000Z",
      "lastMessageAt": "2023-07-19T14:45:00.000Z"
    }
  ],
  "pagination": {
    "total": 8,
    "page": 1,
    "limit": 10,
    "pages": 1
  }
}
```

#### Get Session Details

**Endpoint:** `GET /sessions/:sessionId`

**Response:**
```json
{
  "session": {
    "id": "session-1234",
    "customerId": "cust-1234",
    "customerInfo": {
      "name": "Alice Johnson",
      "email": "alice@example.com",
      "phone": "+1234567890"
    },
    "channel": "whatsapp",
    "status": "with_agent",
    "agentId": "user-5678",
    "agentName": "Jane Smith",
    "startedAt": "2023-07-19T14:30:00.000Z",
    "lastMessageAt": "2023-07-19T14:45:00.000Z"
  },
  "messages": [
    {
      "id": "msg-1234",
      "text": "Hello, I need help with my order #12345",
      "sender": "customer",
      "timestamp": "2023-07-19T14:30:00.000Z"
    },
    {
      "id": "msg-1235",
      "text": "I'll help you with your order #12345. Let me look that up for you.",
      "sender": "ai",
      "timestamp": "2023-07-19T14:31:00.000Z"
    }
  ]
}
```

### Analytics

#### Get Dashboard Analytics

**Endpoint:** `GET /analytics/dashboard`

**Query Parameters:**
- `startDate`: Start date (YYYY-MM-DD)
- `endDate`: End date (YYYY-MM-DD)

**Response:**
```json
{
  "period": {
    "start": "2023-07-01",
    "end": "2023-07-19"
  },
  "overview": {
    "totalConversations": 1250,
    "aiResolved": 875,
    "agentHandovers": 375,
    "avgResponseTime": 12.5,
    "avgResolutionTime": 180.2,
    "avgSatisfactionScore": 4.2
  },
  "byChannel": {
    "whatsapp": {
      "conversations": 750,
      "aiResolved": 525,
      "agentHandovers": 225
    },
    "web": {
      "conversations": 350,
      "aiResolved": 245,
      "agentHandovers": 105
    },
    "email": {
      "conversations": 150,
      "aiResolved": 105,
      "agentHandovers": 45
    }
  },
  "byDay": [
    {
      "date": "2023-07-01",
      "conversations": 65,
      "aiResolved": 45,
      "agentHandovers": 20
    }
  ],
  "topIntents": [
    {
      "intent": "order_status",
      "count": 325,
      "aiResolvedRate": 0.85
    }
  ]
}
```

## WebSocket Protocol

### Connection

Connect to the WebSocket server:

```
wss://your-domain.com/ws
```

Query parameters:
- `userId`: User identifier
- `sessionId`: Session identifier (optional)
- `token`: Authentication token (if required)

### Message Types

#### Client to Server

**Text Message:**
```json
{
  "type": "text",
  "text": "Hello, I need help with my order",
  "id": "msg-1234567890",
  "timestamp": "2023-07-19T14:00:00.000Z"
}
```

**Audio Message:**
```json
{
  "type": "audio",
  "audio": "base64EncodedAudioData...",
  "format": "mp3",
  "id": "audio-1234567890",
  "timestamp": "2023-07-19T14:05:00.000Z"
}
```

**Handover Request:**
```json
{
  "type": "handover_request",
  "timestamp": "2023-07-19T14:10:00.000Z"
}
```

**Typing Indicator:**
```json
{
  "type": "typing",
  "isTyping": true,
  "timestamp": "2023-07-19T14:02:00.000Z"
}
```

#### Server to Client

**Connection Established:**
```json
{
  "type": "connection_established",
  "connectionId": "conn-1234567890",
  "userId": "user123",
  "sessionId": "session456",
  "message": "Connected to AI Customer Support",
  "timestamp": "2023-07-19T14:00:00.000Z"
}
```

**AI Message:**
```json
{
  "type": "message",
  "text": "I'd be happy to help with your order. Could you please provide your order number?",
  "messageId": "ai-1234567890",
  "timestamp": "2023-07-19T14:00:10.000Z",
  "sender": "ai"
}
```

**Typing Indicators:**
```json
{ "type": "typing_start", "timestamp": "2023-07-19T14:00:05.000Z" }
{ "type": "typing_stop", "timestamp": "2023-07-19T14:00:10.000Z" }
```

**Transcription:**
```json
{
  "type": "transcription",
  "text": "I need help with my recent purchase",
  "timestamp": "2023-07-19T14:05:05.000Z"
}
```

**Handover:**
```json
{
  "type": "handover_initiated",
  "message": "Connecting you with a human agent...",
  "timestamp": "2023-07-19T14:10:05.000Z"
}
```

**Agent Message:**
```json
{
  "type": "message",
  "text": "Hi, I'm Jane. I'll be helping you with your order today.",
  "messageId": "agent-1234567890",
  "agentId": "agent123",
  "agentName": "Jane Smith",
  "timestamp": "2023-07-19T14:11:00.000Z",
  "sender": "agent"
}
```

**Error:**
```json
{
  "type": "error",
  "message": "Failed to process your message",
  "code": "processing_error",
  "timestamp": "2023-07-19T14:15:00.000Z"
}
```

## Error Handling

All API endpoints use standard HTTP status codes and return error details in a consistent format:

```json
{
  "error": {
    "code": "invalid_request",
    "message": "The request was invalid",
    "details": "Missing required field: message"
  },
  "requestId": "req-1234567890"
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| `authentication_error` | Authentication failed |
| `authorization_error` | User not authorized for this action |
| `invalid_request` | Invalid request parameters |
| `resource_not_found` | Requested resource not found |
| `rate_limit_exceeded` | API rate limit exceeded |
| `service_unavailable` | Service temporarily unavailable |
| `internal_error` | Internal server error |

## Rate Limiting

API endpoints are rate-limited to prevent abuse. Rate limits are specified in the response headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1626712345
```

When rate limits are exceeded, the API returns a 429 Too Many Requests status code.
