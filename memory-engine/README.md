# Memory Engine Service

The Memory Engine Service is a core component of the AI Customer Support Platform, responsible for managing long-term memory, context retrieval, and knowledge base search functionality.

## Features

- **Vector Embeddings**: Generate and store embeddings for semantic search
- **Memory Management**: Store and retrieve short-term and long-term memories
- **Knowledge Base Search**: Search for relevant information based on user queries
- **Context Optimization**: Optimize context windows for token efficiency
- **Session Context Management**: Store and retrieve session context

## Architecture

The Memory Engine Service is built with Python using FastAPI and integrates with:

- **ChromaDB**: Vector database for storing embeddings
- **Redis**: For short-term memory and session context
- **OpenAI API**: For generating embeddings

## API Endpoints

### Memory Management

- `POST /memories`: Create a new memory or update an existing one
- `GET /memories/{user_id}`: Retrieve memories for a user

### Knowledge Base

- `POST /knowledge/search`: Search the knowledge base for relevant information
- `POST /vectors`: Store a vector embedding for future similarity search

### Session Context

- `GET /context/{session_id}`: Get the context for a specific session
- `POST /context/{session_id}`: Update the context for a specific session

### Context Optimization

- `POST /optimize-context`: Optimize the context window for token efficiency

### Health Check

- `GET /health`: Check the health status of the Memory Engine service

## Setup and Installation

### Prerequisites

- Python 3.10+
- Redis
- ChromaDB
- OpenAI API key

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key | - |
| `REDIS_HOST` | Redis host | `redis` |
| `REDIS_PORT` | Redis port | `6379` |
| `REDIS_PASSWORD` | Redis password | - |
| `CHROMA_HOST` | ChromaDB host | `chroma` |
| `CHROMA_PORT` | ChromaDB port | `8000` |
| `MEMORY_ENGINE_API_KEY` | API key for authentication | - |
| `SESSION_CONTEXT_TTL` | TTL for session context in seconds | `86400` |

### Local Development

1. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Set environment variables:
   ```bash
   export OPENAI_API_KEY=your_openai_api_key
   export REDIS_HOST=localhost
   export CHROMA_HOST=localhost
   ```

4. Run the service:
   ```bash
   uvicorn app:app --reload
   ```

### Docker

Build and run with Docker:

```bash
docker build -t memory-engine .
docker run -p 8000:8000 \
  -e OPENAI_API_KEY=your_openai_api_key \
  -e REDIS_HOST=redis \
  -e CHROMA_HOST=chromadb \
  memory-engine
```

### Kubernetes

Deploy to Kubernetes:

```bash
kubectl apply -f ../kubernetes/memory-engine-deployment.yaml
```

## Usage Examples

### Store a Memory

```bash
curl -X POST http://localhost:8000/memories \
  -H "X-API-Key: your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "type": "long_term",
    "key": "preferences",
    "value": {
      "preferred_language": "en",
      "notification_preferences": "email"
    },
    "metadata": {
      "source": "user_settings",
      "importance": 0.8
    }
  }'
```

### Search Knowledge Base

```bash
curl -X POST http://localhost:8000/knowledge/search \
  -H "X-API-Key: your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "How do I reset my password?",
    "organizationId": "org123",
    "limit": 3
  }'
```

### Optimize Context

```bash
curl -X POST http://localhost:8000/optimize-context \
  -H "X-API-Key: your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "conversation_history": [
      {"role": "system", "content": "You are a helpful assistant."},
      {"role": "user", "content": "Hello, I need help."},
      {"role": "assistant", "content": "How can I help you today?"}
    ],
    "user_query": "I need help with my order",
    "userId": "user123",
    "sessionId": "session456",
    "max_tokens": 4000
  }'
```

## Performance Considerations

- **Embedding Generation**: Generating embeddings is computationally intensive. Consider using background tasks for non-time-critical operations.
- **Vector Search**: For large collections, consider implementing caching or optimizing search parameters.
- **Memory Management**: Implement TTL for short-term memories to prevent Redis from growing too large.

## Security Considerations

- **API Authentication**: All endpoints are protected with API key authentication.
- **Data Isolation**: Ensure proper tenant isolation by including organization IDs in queries.
- **Input Validation**: All inputs are validated using Pydantic models.
- **Error Handling**: Errors are logged but don't expose sensitive information in responses.

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -am 'Add new feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Submit a pull request
