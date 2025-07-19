# Channel Integrations Service

This service handles integration with various communication channels for the AI Customer Support Chatbot platform.

## Features

- WhatsApp integration using WhatsApp Cloud API / Twilio
- Web chat integration via WebSockets
- Email integration for processing incoming emails
- Unified message handling across channels
- Message routing and delivery

## Tech Stack

- Node.js with Express
- WebSocket for real-time web chat
- Twilio/WhatsApp Cloud API client
- Email processing (IMAP/SMTP)
- Redis for pub/sub messaging

## API Endpoints

- `POST /api/whatsapp/webhook` - WhatsApp webhook endpoint
- `POST /api/email/process` - Process incoming emails
- `GET /api/health` - Health check endpoint
- WebSocket endpoint for web chat

## Configuration

Environment variables:
- `PORT` - Server port
- `CHATBOT_CORE_URL` - URL for the chatbot core service
- `REDIS_URL` - Redis connection URL
- `WHATSAPP_API_TOKEN` - WhatsApp API token
- `TWILIO_ACCOUNT_SID` - Twilio account SID (if using Twilio)
- `TWILIO_AUTH_TOKEN` - Twilio auth token (if using Twilio)
- `EMAIL_*` - Email configuration variables
