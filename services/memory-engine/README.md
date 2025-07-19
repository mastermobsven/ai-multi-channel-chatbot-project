# Memory Engine Service

This service handles long-term memory storage and retrieval using vector embeddings.

## Features

- Vector-based memory storage using ChromaDB
- Semantic search for relevant conversation history
- Memory summarization and context management
- Integration with chatbot core service

## Tech Stack

- Python 3.9+
- FastAPI
- ChromaDB for vector storage
- OpenAI embeddings

## API Endpoints

- `POST /api/memory` - Store a conversation memory
- `GET /api/memory` - Retrieve memory for a user/session
- `GET /api/memory/search` - Search for relevant memories
- `GET /api/health` - Health check endpoint

## Configuration

Environment variables:
- `OPENAI_API_KEY` - OpenAI API key for embeddings
- `CHROMA_PERSISTENCE_DIR` - Directory for ChromaDB persistence
- `LOG_LEVEL` - Logging level
