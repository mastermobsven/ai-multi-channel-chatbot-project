# Chatbot Core Service

This service handles message parsing, context management, GPT-4o API calls, and reply routing.

## Features

- Message processing pipeline
- OpenAI GPT-4o integration
- Message routing to appropriate channels
- Context management
- Whisper integration for audio transcription

## Tech Stack

- Node.js with Express
- OpenAI SDK
- Redis client for short-term memory
- Vector DB client for long-term memory

## API Endpoints

- `POST /api/message` - Process incoming messages
- `GET /api/health` - Health check endpoint
- `POST /api/transcribe` - Audio transcription endpoint

## Configuration

Environment variables:
- `OPENAI_API_KEY` - OpenAI API key
- `REDIS_URL` - Redis connection URL
- `VECTOR_DB_URL` - Vector database connection URL
- `LOG_LEVEL` - Logging level
