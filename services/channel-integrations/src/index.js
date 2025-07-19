require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const http = require('http');
const WebSocket = require('ws');
const { logger } = require('./utils/logger');
const whatsappRoutes = require('./routes/whatsappRoutes');
const emailRoutes = require('./routes/emailRoutes');
const healthRoutes = require('./routes/healthRoutes');
const { setupWebSocketServer } = require('./services/webChatService');
const { initializeRedis } = require('./services/messagingService');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3003;

// Create HTTP server
const server = http.createServer(app);

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // CORS support
app.use(express.json({ limit: '50mb' })); // JSON body parser with larger limit for media
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } })); // Logging

// Initialize Redis for pub/sub messaging
initializeRedis().catch(err => {
  logger.error(`Failed to initialize Redis: ${err.message}`);
});

// Routes
app.use('/api', whatsappRoutes);
app.use('/api', emailRoutes);
app.use('/api', healthRoutes);

// Setup WebSocket server for web chat
const wss = new WebSocket.Server({ server });
setupWebSocketServer(wss);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`);
  logger.error(err.stack);
  
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      status: err.status || 500
    }
  });
});

// Start server
server.listen(PORT, () => {
  logger.info(`Channel Integrations Service running on port ${PORT}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  // Close WebSocket server
  wss.close(() => {
    logger.info('WebSocket server closed');
  });
  
  // Close HTTP server
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

module.exports = { app, server }; // For testing
