# Deployment Guide for AI Customer Support Platform

This guide provides detailed instructions for deploying the AI Customer Support Platform in different environments, from development to production.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [Docker Deployment](#docker-deployment)
4. [Kubernetes Deployment](#kubernetes-deployment)
5. [Environment Variables](#environment-variables)
6. [Security Considerations](#security-considerations)
7. [Scaling Strategies](#scaling-strategies)
8. [Monitoring and Logging](#monitoring-and-logging)
9. [Backup and Recovery](#backup-and-recovery)
10. [Troubleshooting](#troubleshooting)

## Prerequisites

Before deploying the AI Customer Support Platform, ensure you have the following:

- **API Keys and Credentials**:
  - OpenAI API key
  - WhatsApp Business API credentials or Twilio account
  - Email account credentials (for email integration)

- **Infrastructure Requirements**:
  - Docker and Docker Compose (for local and containerized deployment)
  - Kubernetes cluster (for production deployment)
  - Domain name and SSL certificates
  - Database servers (PostgreSQL and MongoDB)
  - Redis server

- **Development Tools**:
  - Node.js 18+ and npm
  - Python 3.9+
  - Git

## Local Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/ai-customer-support-platform.git
cd ai-customer-support-platform
```

### 2. Set Up Environment Variables

```bash
cp .env.example .env
# Edit .env file with your configuration
```

### 3. Start Individual Services for Development

#### Chatbot Core Service

```bash
cd services/chatbot-core
npm install
npm run dev
```

#### Memory Engine Service

```bash
cd services/memory-engine
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

#### Channel Integrations Service

```bash
cd services/channel-integrations
npm install
npm run dev
```

#### Web Widget

```bash
cd web-widget
npm install
npm start
```

### 4. Run All Services with Docker Compose

For integrated local development with all services:

```bash
docker-compose -f docker-compose.dev.yml up
```

## Docker Deployment

### 1. Build Docker Images

```bash
# Build all services
docker-compose build

# Build individual services
docker build -t ai-support/chatbot-core:latest ./services/chatbot-core
docker build -t ai-support/memory-engine:latest ./services/memory-engine
docker build -t ai-support/channel-integrations:latest ./services/channel-integrations
docker build -t ai-support/web-widget:latest ./web-widget
```

### 2. Run with Docker Compose

```bash
# Start all services
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f
```

### 3. Stopping Services

```bash
docker-compose down
```

## Kubernetes Deployment

### 1. Configure Kubernetes Resources

Update the Kubernetes configuration files in the `kubernetes/` directory with your specific settings:

- Update image references in deployment files
- Configure ConfigMap and Secret resources with your environment variables
- Set up appropriate resource requests and limits

### 2. Apply Kubernetes Configurations

```bash
# Create namespace
kubectl create namespace ai-support

# Apply ConfigMap and Secrets
kubectl apply -f kubernetes/config-and-secrets.yaml -n ai-support

# Deploy database services
kubectl apply -f kubernetes/redis-deployment.yaml -n ai-support
kubectl apply -f kubernetes/mongodb-deployment.yaml -n ai-support
kubectl apply -f kubernetes/postgres-deployment.yaml -n ai-support

# Deploy application services
kubectl apply -f kubernetes/chatbot-core-deployment.yaml -n ai-support
kubectl apply -f kubernetes/memory-engine-deployment.yaml -n ai-support
kubectl apply -f kubernetes/channel-integrations-deployment.yaml -n ai-support

# Deploy ingress
kubectl apply -f kubernetes/ingress.yaml -n ai-support
```

### 3. Verify Deployment

```bash
# Check pod status
kubectl get pods -n ai-support

# Check services
kubectl get services -n ai-support

# Check ingress
kubectl get ingress -n ai-support
```

### 4. Scaling Services

```bash
# Scale a deployment
kubectl scale deployment chatbot-core --replicas=3 -n ai-support
```

## Environment Variables

The platform uses environment variables for configuration. Below is a comprehensive list of required variables:

### Core Environment Variables

```
# OpenAI API
OPENAI_API_KEY=your_openai_api_key

# Database Connections
MONGO_USERNAME=admin
MONGO_PASSWORD=password
POSTGRES_USER=admin
POSTGRES_PASSWORD=password
POSTGRES_DB=ai_support
REDIS_URL=redis://redis:6379

# Service URLs
CHATBOT_CORE_URL=http://chatbot-core:3000/api
VECTOR_DB_URL=http://memory-engine:3001
```

### Channel-Specific Variables

```
# WhatsApp Cloud API
WHATSAPP_API_VERSION=v18.0
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_API_TOKEN=your_whatsapp_api_token
WHATSAPP_VERIFY_TOKEN=your_webhook_verify_token

# Twilio (Alternative to WhatsApp Cloud API)
TWILIO_ENABLED=false
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# Email Configuration
EMAIL_USER=your_email@example.com
EMAIL_PASSWORD=your_email_password
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_FROM=your_email@example.com
```

### Service Configuration

```
# Service Ports
CHATBOT_CORE_PORT=3000
MEMORY_ENGINE_PORT=3001
CHANNEL_INTEGRATIONS_PORT=3003
WEB_WIDGET_PORT=3005

# Logging
LOG_LEVEL=info

# Memory Engine
CHROMA_PERSISTENCE_DIR=/data/chromadb
```

## Security Considerations

### API Key Management

- Store API keys and secrets in Kubernetes Secrets or environment variables
- Rotate keys regularly
- Use different API keys for development and production

### Network Security

- Use HTTPS for all external communication
- Configure proper network policies in Kubernetes
- Use private networks for inter-service communication

### Authentication and Authorization

- Implement JWT-based authentication for admin APIs
- Use role-based access control for admin dashboard
- Secure WebSocket connections with authentication tokens

### Data Protection

- Encrypt sensitive data at rest
- Implement proper data retention policies
- Follow GDPR and other relevant data protection regulations

## Scaling Strategies

### Horizontal Scaling

- Configure auto-scaling for Kubernetes deployments based on CPU/memory usage
- Use Redis for distributed session management and caching
- Implement stateless services where possible

### Database Scaling

- Use connection pooling for database connections
- Consider read replicas for PostgreSQL in high-load scenarios
- Implement sharding for MongoDB as conversation volume grows

### Cost Optimization

- Use resource limits and requests in Kubernetes
- Implement TTL for Redis caches
- Optimize OpenAI API usage with token counting and caching

## Monitoring and Logging

### Logging Strategy

- Use structured logging (JSON format)
- Set appropriate log levels (debug, info, warn, error)
- Implement request ID tracking across services

### Monitoring Tools

- Prometheus for metrics collection
- Grafana for dashboards
- Alertmanager for alerts

### Key Metrics to Monitor

- Service response times
- Error rates
- Message processing throughput
- AI API usage and costs
- Database performance
- Memory usage

## Backup and Recovery

### Database Backups

- Schedule regular PostgreSQL and MongoDB backups
- Store backups in a secure, off-site location
- Test restoration procedures regularly

### Disaster Recovery

- Document recovery procedures
- Implement multi-region redundancy for production deployments
- Set up automated failover where possible

## Troubleshooting

### Common Issues and Solutions

#### Service Connection Issues

- Check network policies and firewall rules
- Verify service discovery is working correctly
- Check for DNS resolution issues

#### Database Connection Problems

- Verify connection strings and credentials
- Check database server status
- Look for connection limits or throttling

#### AI API Issues

- Check API key validity and rate limits
- Implement exponential backoff for retries
- Monitor token usage and implement fallbacks

### Debugging Tools

- Use kubectl logs for Kubernetes deployments
- Check service-specific logs
- Use distributed tracing for complex issues

### Support Resources

- GitHub repository issues
- Documentation wiki
- Community forums

---

## Additional Resources

- [Architecture Documentation](./ARCHITECTURE.md)
- [API Documentation](./API_DOCS.md)
- [Database Schema](./DATABASE_SCHEMA.md)
- [Implementation Plan](./IMPLEMENTATION_PLAN.md)

---

This deployment guide is a living document and will be updated as the platform evolves.
