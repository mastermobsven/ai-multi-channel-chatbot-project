require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { logger } = require('./utils/logger');
const messageRoutes = require('./routes/messageRoutes');
const healthRoutes = require('./routes/healthRoutes');
const transcriptionRoutes = require('./routes/transcriptionRoutes');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // CORS support
app.use(express.json({ limit: '50mb' })); // JSON body parser with larger limit for audio
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } })); // Logging

// Routes
app.use('/api', messageRoutes);
app.use('/api', healthRoutes);
app.use('/api', transcriptionRoutes);

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
app.listen(PORT, () => {
  logger.info(`Chatbot Core Service running on port ${PORT}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  // Close any connections here
  process.exit(0);
});

module.exports = app; // For testing
