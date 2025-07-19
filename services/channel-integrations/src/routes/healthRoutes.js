const express = require('express');
const router = express.Router();
const { logger } = require('../utils/logger');

/**
 * @route GET /api/health
 * @desc Health check endpoint for the service
 * @access Public
 */
router.get('/health', async (req, res) => {
  try {
    // Check connections to dependencies here
    // For example, Redis, Chatbot Core API, etc.
    
    // For now, just return a simple health check
    return res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'channel-integrations',
      version: process.env.VERSION || '1.0.0'
    });
  } catch (error) {
    logger.error(`Health check failed: ${error.message}`);
    return res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route GET /api/health/dependencies
 * @desc Detailed health check for all service dependencies
 * @access Private (should be protected in production)
 */
router.get('/health/dependencies', async (req, res) => {
  try {
    // Initialize health report
    const healthReport = {
      service: 'channel-integrations',
      version: process.env.VERSION || '1.0.0',
      timestamp: new Date().toISOString(),
      dependencies: {
        redis: { status: 'pending' },
        chatbotCore: { status: 'pending' },
        emailService: { status: 'pending' },
        whatsappService: { status: 'pending' },
        webChatService: { status: 'pending' }
      }
    };
    
    // Check Redis connection
    try {
      const redis = require('ioredis');
      const redisClient = new redis(process.env.REDIS_URL || 'redis://localhost:6379');
      await redisClient.ping();
      healthReport.dependencies.redis = { status: 'healthy' };
      redisClient.disconnect();
    } catch (redisError) {
      healthReport.dependencies.redis = { 
        status: 'unhealthy',
        error: redisError.message
      };
    }
    
    // Check Chatbot Core API
    try {
      const axios = require('axios');
      const chatbotCoreUrl = process.env.CHATBOT_CORE_URL || 'http://chatbot-core:3000/api';
      const response = await axios.get(`${chatbotCoreUrl}/health`, { timeout: 5000 });
      
      if (response.status === 200) {
        healthReport.dependencies.chatbotCore = { 
          status: 'healthy',
          version: response.data.version || 'unknown'
        };
      } else {
        healthReport.dependencies.chatbotCore = { 
          status: 'unhealthy',
          statusCode: response.status
        };
      }
    } catch (apiError) {
      healthReport.dependencies.chatbotCore = { 
        status: 'unhealthy',
        error: apiError.message
      };
    }
    
    // Check email service
    if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
      healthReport.dependencies.emailService = { status: 'configured' };
    } else {
      healthReport.dependencies.emailService = { 
        status: 'unconfigured',
        message: 'Email credentials not set'
      };
    }
    
    // Check WhatsApp service
    if (process.env.WHATSAPP_API_TOKEN || 
        (process.env.TWILIO_ENABLED === 'true' && 
         process.env.TWILIO_ACCOUNT_SID && 
         process.env.TWILIO_AUTH_TOKEN)) {
      healthReport.dependencies.whatsappService = { status: 'configured' };
    } else {
      healthReport.dependencies.whatsappService = { 
        status: 'unconfigured',
        message: 'WhatsApp/Twilio credentials not set'
      };
    }
    
    // WebSocket server status
    const WebSocket = require('ws');
    const wss = require('../index').wss;
    
    if (wss && wss.clients) {
      const connectedClients = [...wss.clients].filter(
        client => client.readyState === WebSocket.OPEN
      ).length;
      
      healthReport.dependencies.webChatService = { 
        status: 'healthy',
        connectedClients
      };
    } else {
      healthReport.dependencies.webChatService = { 
        status: 'unhealthy',
        message: 'WebSocket server not initialized'
      };
    }
    
    // Determine overall status
    const criticalDependencies = ['redis', 'chatbotCore'];
    const hasUnhealthyCritical = criticalDependencies.some(
      dep => healthReport.dependencies[dep].status === 'unhealthy'
    );
    
    healthReport.status = hasUnhealthyCritical ? 'unhealthy' : 'healthy';
    
    return res.status(200).json(healthReport);
  } catch (error) {
    logger.error(`Detailed health check failed: ${error.message}`);
    return res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
