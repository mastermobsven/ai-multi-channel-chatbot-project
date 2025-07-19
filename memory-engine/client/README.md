# Memory Engine Client Libraries

This directory contains client libraries for interacting with the Memory Engine Service of the AI Customer Support Platform.

## Available Clients

- **Python Client**: Asynchronous and synchronous clients for Python applications
- **JavaScript Client**: Client for Node.js and browser applications

## Features

All clients provide access to the following Memory Engine features:

- **Memory Management**: Store and retrieve short-term and long-term memories
- **Knowledge Base Search**: Search for relevant information based on user queries
- **Vector Embeddings**: Store and retrieve vector embeddings for semantic search
- **Session Context**: Manage session context for conversations
- **Context Optimization**: Optimize context windows for token efficiency

## Python Client

### Installation

```bash
# From the client directory
pip install -e .
```

### Usage

```python
import os
from memory_client import MemoryEngineClient, SyncMemoryEngineClient

# Async client
async def main():
    client = MemoryEngineClient(
        base_url="http://localhost:8000",
        api_key="your-api-key"
    )
    
    # Create a memory
    memory = await client.create_memory(
        user_id="user123",
        memory_type="long_term",
        key="preferences",
        value={"preferred_language": "en"}
    )
    
    # Search knowledge base
    results = await client.search_knowledge(
        query="How do I reset my password?",
        organization_id="org456"
    )
    
    # Optimize context
    optimized = await client.optimize_context(
        conversation_history=[...],
        user_query="Help me with my order",
        user_id="user123"
    )

# Sync client
def sync_example():
    client = SyncMemoryEngineClient(
        base_url="http://localhost:8000",
        api_key="your-api-key"
    )
    
    # Get memories
    memories = client.get_memories("user123")
    
    # Check health
    health = client.health_check()
```

See the `examples/python_example.py` file for a complete example.

## JavaScript Client

### Installation

```bash
# From the client directory
npm install
```

### Usage

```javascript
const MemoryEngineClient = require('./memory-client');

// Initialize the client
const client = new MemoryEngineClient({
  baseUrl: 'http://localhost:8000',
  apiKey: 'your-api-key'
});

// Create a memory
async function createMemory() {
  const memory = await client.createMemory({
    userId: 'user123',
    type: 'long_term',
    key: 'preferences',
    value: { preferredLanguage: 'en' }
  });
  
  console.log('Memory created:', memory);
}

// Search knowledge base
async function searchKnowledge() {
  const results = await client.searchKnowledge({
    query: 'How do I reset my password?',
    organizationId: 'org456'
  });
  
  console.log('Search results:', results);
}

// Optimize context
async function optimizeContext() {
  const optimized = await client.optimizeContext({
    conversationHistory: [...],
    userQuery: 'Help me with my order',
    userId: 'user123'
  });
  
  console.log('Optimized context:', optimized);
}
```

See the `examples/node-example.js` file for a complete example.

## API Reference

### Memory Management

- `create_memory` / `createMemory`: Create a new memory or update an existing one
- `get_memories` / `getMemories`: Retrieve memories for a user

### Knowledge Base

- `search_knowledge` / `searchKnowledge`: Search the knowledge base for relevant information
- `create_vector_embedding` / `createVectorEmbedding`: Store a vector embedding for future similarity search

### Session Context

- `get_session_context` / `getSessionContext`: Get the context for a specific session
- `update_session_context` / `updateSessionContext`: Update the context for a specific session

### Context Optimization

- `optimize_context` / `optimizeContext`: Optimize the context window for token efficiency

### Health Check

- `health_check` / `healthCheck`: Check the health status of the Memory Engine service

## Error Handling

All clients include proper error handling and logging. Errors are logged and re-thrown for application-level handling.

## Configuration

Both clients accept the following configuration options:

- `base_url` / `baseUrl`: Base URL of the Memory Engine Service
- `api_key` / `apiKey`: API key for authentication
- `timeout`: Request timeout in seconds (Python) or milliseconds (JavaScript)

## Examples

See the `examples` directory for complete usage examples:

- `python_example.py`: Example usage of the Python client
- `node-example.js`: Example usage of the JavaScript client
