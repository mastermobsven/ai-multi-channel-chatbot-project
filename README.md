# AI Customer Support Chatbot Platform

A modular, production-ready AI-powered customer support chatbot platform that handles multi-channel communication via WhatsApp, web chat, and email.

## 🧠 Core Features

### AI Chatbot with GPT-based Intelligence
- OpenAI GPT-4o for text responses
- Whisper for audio transcriptions (voice messages)
- Optional DALL·E or CLIP for image generation/understanding

### Multi-Channel Support
- WhatsApp integration using WhatsApp Cloud API / Twilio
- Web chat widget embeddable on websites (React component)
- Email-based chat processing

### Contextual Memory
- Per-user, multi-session context across platforms using Redis
- Long-term memory storage with ChromaDB for embeddings and search

### Multilingual Support
- Detect and respond in user's language using GPT-4o
- Optional translation layer for fallback

### Live-Agent Handover
- Seamless switch from AI to human agent
- Agent notification system with chat history
- Real-time or asynchronous takeover

### Admin Dashboard
- Built with Next.js + TailwindCSS
- Role-based access for chat management and system configuration

## 🏗️ Project Structure

```
ai-customer-support-platform/
├── services/
│   ├── chatbot-core/           # Core chatbot service
│   ├── memory-engine/          # Memory and context management
│   ├── channel-integrations/   # WhatsApp, Web, Email integrations
│   ├── live-agent-engine/      # Agent handover system
│   └── admin-api/              # API for admin dashboard
├── frontend/
│   ├── admin-dashboard/        # Next.js admin dashboard
│   └── chat-widget/            # Embeddable chat widget
├── infrastructure/
│   ├── docker/                 # Docker configurations
│   └── kubernetes/             # Kubernetes deployment files
└── docs/                       # Documentation
```

## 📦 Getting Started

### Prerequisites
- Node.js 18+
- Python 3.9+
- Docker and Docker Compose
- OpenAI API key

### Installation
1. Clone the repository
2. Set up environment variables
3. Run `docker-compose up` to start all services

## 🚀 Development

See individual service READMEs for specific development instructions.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🔌 Client Libraries

### Memory Engine Client Libraries

The Memory Engine service provides client libraries in multiple languages for seamless integration with other components:

#### JavaScript/TypeScript Client
- Full-featured client for Node.js and browser applications
- Strongly-typed TypeScript interface with complete type definitions
- Supports all Memory Engine endpoints with proper error handling
- Includes timeout handling and comprehensive documentation

#### Python Client
- Asynchronous and synchronous client implementations
- Complete support for all Memory Engine features
- Proper error handling and logging

#### Features Supported by All Clients
- Memory management (short-term and long-term)
- Knowledge base semantic search
- Vector embedding creation
- Session context management
- Context optimization for token efficiency
- Health checks

#### Usage Examples
Each client library includes comprehensive examples demonstrating all features:
- Node.js example
- TypeScript example
- Python example (async and sync)

See the `memory-engine/client/README.md` for detailed documentation, installation instructions, and API reference.
