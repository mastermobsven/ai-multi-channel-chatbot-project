# Database Schema for AI Customer Support Platform

This document outlines the database schema for the AI Customer Support Platform, including both PostgreSQL (structured data) and MongoDB (conversation logs) schemas.

## PostgreSQL Schema (Structured Data)

### Users Table

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    organization_id UUID REFERENCES organizations(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP WITH TIME ZONE
);
```

### Organizations Table

```sql
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    subscription_tier VARCHAR(50) NOT NULL DEFAULT 'free',
    subscription_status VARCHAR(50) NOT NULL DEFAULT 'active',
    max_agents INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Agents Table

```sql
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    display_name VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'offline',
    availability VARCHAR(50) DEFAULT 'unavailable',
    max_concurrent_chats INTEGER DEFAULT 3,
    specialties TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Channels Table

```sql
CREATE TABLE channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'whatsapp', 'web', 'email'
    config JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Customers Table

```sql
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    external_id VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(50),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (organization_id, external_id)
);
```

### Sessions Table

```sql
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
    channel_id UUID NOT NULL REFERENCES channels(id),
    agent_id UUID REFERENCES agents(id),
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- 'active', 'waiting', 'with_agent', 'closed'
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB
);
```

### Analytics Table

```sql
CREATE TABLE analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    date DATE NOT NULL,
    total_conversations INTEGER DEFAULT 0,
    ai_resolved_conversations INTEGER DEFAULT 0,
    agent_resolved_conversations INTEGER DEFAULT 0,
    avg_response_time_seconds FLOAT,
    avg_resolution_time_seconds FLOAT,
    avg_satisfaction_score FLOAT,
    channel_metrics JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Knowledge Base Table

```sql
CREATE TABLE knowledge_base (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(100),
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### API Keys Table

```sql
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    name VARCHAR(100) NOT NULL,
    key_hash VARCHAR(255) NOT NULL,
    permissions TEXT[],
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP WITH TIME ZONE
);
```

### Settings Table

```sql
CREATE TABLE settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    category VARCHAR(100) NOT NULL,
    key VARCHAR(100) NOT NULL,
    value JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (organization_id, category, key)
);
```

## MongoDB Schema (Conversation Data)

### Messages Collection

```javascript
{
  _id: ObjectId,
  sessionId: UUID,  // References sessions.id in PostgreSQL
  organizationId: UUID,  // References organizations.id in PostgreSQL
  customerId: UUID,  // References customers.id in PostgreSQL
  channelId: UUID,  // References channels.id in PostgreSQL
  agentId: UUID,  // References agents.id in PostgreSQL (optional)
  type: String,  // 'text', 'audio', 'image', 'system', 'handover'
  content: {
    text: String,  // For text messages
    mediaUrl: String,  // For audio/image messages
    mediaType: String,  // MIME type
    systemAction: String,  // For system messages
  },
  metadata: {
    channelMessageId: String,  // Original ID from the channel
    sentiment: String,  // Optional sentiment analysis
    entities: Array,  // Optional entity extraction
    intentDetected: String,  // Optional intent detection
    aiConfidence: Number,  // AI confidence score
    processingTime: Number  // Time taken to process in ms
  },
  sender: String,  // 'customer', 'ai', 'agent', 'system'
  timestamp: Date,
  isRead: Boolean,
  readAt: Date
}
```

### Conversations Collection

```javascript
{
  _id: ObjectId,
  sessionId: UUID,  // References sessions.id in PostgreSQL
  organizationId: UUID,
  summary: String,  // AI-generated summary
  topics: Array,  // Detected topics
  intents: Array,  // Detected intents
  sentiment: String,  // Overall sentiment
  satisfactionScore: Number,  // Customer satisfaction score
  aiResolved: Boolean,  // Whether resolved by AI or handed over
  messageCount: Number,
  firstMessageAt: Date,
  lastMessageAt: Date,
  resolutionTime: Number,  // Time to resolution in seconds
  metadata: Object  // Additional data
}
```

### Memory Collection

```javascript
{
  _id: ObjectId,
  customerId: UUID,  // References customers.id in PostgreSQL
  organizationId: UUID,
  type: String,  // 'short_term', 'long_term'
  key: String,  // Memory identifier
  value: Object,  // Memory content
  importance: Number,  // Importance score
  lastAccessed: Date,
  createdAt: Date,
  expiresAt: Date  // Optional expiration
}
```

### Vector Embeddings Collection

```javascript
{
  _id: ObjectId,
  organizationId: UUID,
  sourceType: String,  // 'knowledge_base', 'conversation', 'custom'
  sourceId: String,  // ID of the source document
  text: String,  // Original text
  embedding: Array,  // Vector embedding
  metadata: Object,  // Additional metadata
  createdAt: Date
}
```

### Audit Logs Collection

```javascript
{
  _id: ObjectId,
  organizationId: UUID,
  userId: UUID,  // References users.id in PostgreSQL
  action: String,  // Action performed
  resource: String,  // Resource affected
  resourceId: String,  // ID of the resource
  details: Object,  // Additional details
  ipAddress: String,
  userAgent: String,
  timestamp: Date
}
```

## Redis Schema (Caching and Real-time Data)

### Session Context

Key: `session:{sessionId}:context`
Value: JSON object containing current session context

### Agent Status

Key: `agent:{agentId}:status`
Value: JSON object with agent status information

### Active Sessions

Key: `organization:{organizationId}:active_sessions`
Value: Sorted set of active session IDs with timestamps

### WebSocket Connections

Key: `websocket:{connectionId}:info`
Value: JSON object with connection details

### Rate Limiting

Key: `ratelimit:{resourceType}:{resourceId}`
Value: Counter with TTL

## Database Relationships

1. **Organizations** have many **Users**, **Channels**, **Customers**, and **Sessions**
2. **Users** can be **Agents**
3. **Customers** have many **Sessions**
4. **Sessions** have many **Messages** (in MongoDB)
5. **Sessions** have one **Conversation** summary (in MongoDB)
6. **Customers** have **Memory** entries (in MongoDB)

## Indexing Strategy

### PostgreSQL Indexes

```sql
-- Users table
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_organization_id ON users(organization_id);

-- Agents table
CREATE INDEX idx_agents_user_id ON agents(user_id);
CREATE INDEX idx_agents_status ON agents(status);

-- Channels table
CREATE INDEX idx_channels_organization_id ON channels(organization_id);
CREATE INDEX idx_channels_type ON channels(type);

-- Customers table
CREATE INDEX idx_customers_organization_id ON customers(organization_id);
CREATE INDEX idx_customers_external_id ON customers(external_id);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_phone ON customers(phone);

-- Sessions table
CREATE INDEX idx_sessions_organization_id ON sessions(organization_id);
CREATE INDEX idx_sessions_customer_id ON sessions(customer_id);
CREATE INDEX idx_sessions_channel_id ON sessions(channel_id);
CREATE INDEX idx_sessions_agent_id ON sessions(agent_id);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_started_at ON sessions(started_at);
```

### MongoDB Indexes

```javascript
// Messages collection
db.messages.createIndex({ sessionId: 1, timestamp: 1 });
db.messages.createIndex({ organizationId: 1 });
db.messages.createIndex({ customerId: 1 });
db.messages.createIndex({ channelId: 1 });
db.messages.createIndex({ agentId: 1 });

// Conversations collection
db.conversations.createIndex({ sessionId: 1 }, { unique: true });
db.conversations.createIndex({ organizationId: 1 });
db.conversations.createIndex({ topics: 1 });
db.conversations.createIndex({ intents: 1 });

// Memory collection
db.memory.createIndex({ customerId: 1, type: 1, key: 1 });
db.memory.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Vector Embeddings collection
db.vectorEmbeddings.createIndex({ organizationId: 1, sourceType: 1 });
db.vectorEmbeddings.createIndex({ sourceId: 1 });
```

## Data Migration Strategy

1. **Initial Setup**: Create database schemas in PostgreSQL and MongoDB
2. **Data Import**: Provide tools for importing existing customer data
3. **Versioning**: Use schema versioning for tracking changes
4. **Migrations**: Implement migration scripts for schema updates

## Backup and Recovery

1. **PostgreSQL**: Daily full backups, hourly incremental backups, WAL archiving
2. **MongoDB**: Daily full backups, oplog-based incremental backups
3. **Redis**: RDB snapshots and AOF persistence
4. **Retention**: 30-day retention policy for all backups
5. **Recovery Testing**: Monthly recovery testing procedure
